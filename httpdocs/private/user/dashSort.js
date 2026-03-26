//Rendezés és keresés segítő függvények

//Keresés funkció

let searchInitialized = false;
let popupTimeout = null; // ÚJ: Az időzítő változója a popup eltüntetéséhez

export function initSearch() {
    if (searchInitialized) return;
    searchInitialized = true;

    document.addEventListener('input', function(e) {
        if (!e.target.classList.contains('search-input')) return;

      const searchText = e.target.value.toLowerCase().trim();
        
        const belsoSearch = e.target.closest('#belsosearch, .belsosearch') || e.target.parentElement;
        
        const keresoTipus = belsoSearch ? belsoSearch.querySelector('.search-select') : null;
        const tipus = keresoTipus ? keresoTipus.value : 'all';

        const tartElemek = document.querySelectorAll('.tart');
        let totalMatches = 0; // ÚJ: Itt fogjuk számolni, van-e egyáltalán találat

        tartElemek.forEach(tart => {
            const meglevo = tart.querySelector('.meglevok');
            if (!meglevo) return;

            let isMatch = false;

            const nev = (meglevo.dataset.nev || '').toLowerCase();
            const periodus = (meglevo.dataset.periodus || '').toLowerCase();
            const megnev = (meglevo.dataset.megnev || '').toLowerCase();
            
            const teljesSzoveg = `${nev} ${periodus} ${megnev}`;

            if (searchText === '') {
                isMatch = true;
            } else if (tipus === 'all' && teljesSzoveg.includes(searchText)) {
                isMatch = true;
            } else if (tipus === 'nev' && nev.includes(searchText)) {
                isMatch = true;
            } else if (tipus === 'idoszak' && periodus.includes(searchText)) {
                isMatch = true;
            } else if (tipus === 'megnevezes' && megnev.includes(searchText)) {
                isMatch = true;
            }

            if (isMatch) {
                totalMatches++; // ÚJ: Növeljük a számlálót
                tart.style.display = '';
                
                if (searchText !== '') {
                    const szuloLista = tart.closest('.creator-list');
                    if (szuloLista && szuloLista.style.display === 'none') {
                        szuloLista.style.display = 'flex'; 
                        
                        const wrapper = tart.closest('.creator-wrapper') || tart.closest('.tarolo');
                        if (wrapper) {
                            const head = wrapper.querySelector('.creator-head');
                            if (head) {
                                head.style.height = '45px'; 
                                const icon = head.querySelector('.toggle-icon');
                                if (icon) icon.style.transform = 'rotate(180deg)'; 
                            }
                        }
                    }
                }
            } else {
                tart.style.display = 'none'; 
            }
        });
        

        // 3. ÜRES CSOPORTOK (Creator Head) ELREJTÉSE
        document.querySelectorAll('.tarolo').forEach(csoport => {
            const lathatoKartyak = Array.from(csoport.querySelectorAll('.tart')).filter(t => t.style.display !== 'none');
            
            if (searchText !== '' && lathatoKartyak.length === 0) {
                csoport.style.display = 'none';
            } else {
                csoport.style.display = ''; 
                
                if (searchText === '') {
                    const lista = csoport.querySelector('.creator-list');
                    const head = csoport.querySelector('.creator-head');
                    const icon = csoport.querySelector('.toggle-icon');
                    
                    if (lista) lista.style.display = 'none';
                    if (head) head.style.height = '8vh';
                    if (icon) icon.style.transform = 'rotate(0deg)';
                }
            }
        });

        // 4. ÜRES "HELYI CSOPORTOK" ELREJTÉSE
        document.querySelectorAll('.helyi-csoport').forEach(helyiCsop => {
            const lathatoHelyi = Array.from(helyiCsop.querySelectorAll('.tart')).filter(t => t.style.display !== 'none');
            
            if (searchText !== '' && lathatoHelyi.length === 0) {
                helyiCsop.style.display = 'none'; 
            } else {
                helyiCsop.style.display = '';     
            }
        });

     const searchContainer = e.target.parentElement;
        
        let noResultPopup = searchContainer.querySelector('.search-no-result-popup');
        
        if (!noResultPopup) {
            noResultPopup = document.createElement('div');
            noResultPopup.className = 'search-no-result-popup';
            
            if (getComputedStyle(searchContainer).position === 'static') {
                searchContainer.style.position = 'relative';
            }
            searchContainer.appendChild(noResultPopup);
        }

        if (searchText !== '' && totalMatches === 0) {
            noResultPopup.innerHTML = `<span class="material-symbols-rounded" style="vertical-align: middle; margin-right: 5px;">search_off</span>A(z) <b class="search-term-display"></b> kifejezésre nincs találat.`;
            noResultPopup.querySelector('.search-term-display').textContent = `"${e.target.value}"`;
            
            noResultPopup.style.opacity = '1';
            noResultPopup.style.display = 'block';

            clearTimeout(popupTimeout);

            popupTimeout = setTimeout(() => {
                noResultPopup.style.opacity = '0';
                setTimeout(() => {
                    if (noResultPopup.style.opacity === '0') {
                        noResultPopup.style.display = 'none';
                    }
                }, 300);
            }, 3000);

        } else {
            noResultPopup.style.opacity = '0';
            noResultPopup.style.display = 'none';
            clearTimeout(popupTimeout);
        }
    });
}

//infoboxos számláló
let chekingInitialized = false;

export function initChekingToggle() {
  const master = document.getElementById('cheking2');
  const infoBox = document.getElementById('stat-info-box');
  const countSpan = document.getElementById('sel-count');
  
  if (!master) return;

  const updateCounter = () => {
    const count = document.querySelectorAll('.cheking:checked').length;
    if (countSpan) countSpan.textContent = count;
  };

  const apply = () => {
    const show = master.checked;
    
    if (infoBox) infoBox.style.display = show ? 'flex' : 'none';

    document.querySelectorAll('.cheking').forEach(el => {
      // A flex helyett a checkboxoknak általában a block vagy inline-block a jobb
      el.style.display = show ? 'block' : 'none'; 
    });
    
    updateCounter();
  };

  // 1. Csúszka eseménykezelője (közvetlenül az elemen vizsgáljuk, hogy be van-e kötve)
  if (!master.__bound) {
      master.addEventListener('change', apply);
      master.__bound = true;
  }

  // 2. Event delegation az innerDiv-en a számlálóhoz
  const innerDiv = document.querySelector('.inner-div');
  if (innerDiv && !innerDiv.__boundCheking) {
      innerDiv.addEventListener('change', (e) => {
          if (e.target.matches('.cheking')) {
              updateCounter();
          }
      });
      innerDiv.__boundCheking = true;
  }

  // Azonnali állapot-érvényesítés
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
