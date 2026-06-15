//Rendezés és keresés segítő függvények

function canUseGroupStatisticsFeature() {
  if (typeof window.canUseGroupStatistics === 'function') {
    return window.canUseGroupStatistics();
  }

  const license = window.__licenseStatus;
  if (license && license.success && license.permissions) {
    return license.permissions.canUseGroupStatistics !== false;
  }

  return true;
}

function notifyGroupStatisticsBlocked() {
  const message = typeof window.explainGroupStatisticsBlocked === 'function'
    ? window.explainGroupStatisticsBlocked()
    : 'A csoportos statisztika a Pro csomagban érhető el.';

  if (typeof window.showLicenseToast === 'function') {
    window.showLicenseToast(message);
    return;
  }

  console.info(message);
}

function getErtekekInnerDiv() {
  return document.querySelector('.ertekek-lista-inner') ||
    document.querySelector('[data-ertekek-lista="1"]') ||
    document.querySelector('article.main[data-content-id="ertekek"] .olvaso .outer-div > .inner-div') ||
    document.querySelector('article.main[data-content-id="ertekek"] .inner-div') ||
    document.querySelector('.main.aktiv-tartalom .olvaso .outer-div > .inner-div') ||
    document.querySelector('.main.aktiv-tartalom .inner-div') ||
    document.querySelector('.inner-div');
}

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
        

        // 3. Üres csoportok és fejlécek elrejtése keresés közben
        const innerDiv = getErtekekInnerDiv();
        const listaGyoker = innerDiv || document;
        const vanAktivKereses = searchText !== '';

        function vanLathatoKartya(container) {
            return Array.from(container.querySelectorAll('.tart'))
                .some(tart => tart.style.display !== 'none');
        }

        // Belső dátumcsoportok: Ma-tegnap / Ezen a héten / stb.
        listaGyoker.querySelectorAll('.datum-intervallum-csopi, .helyi-csoport').forEach(csoport => {
            csoport.style.display = (!vanAktivKereses || vanLathatoKartya(csoport)) ? '' : 'none';
        });

        // Fő tulaj / egyéb csoportok: Saját értékelések, más megosztásai, név/időszak/típus szerinti blokkok.
        listaGyoker.querySelectorAll('.tulaj-csopi, .csopi:not(.datum-intervallum-csopi), .tarolo').forEach(csoport => {
            csoport.style.display = (!vanAktivKereses || vanLathatoKartya(csoport)) ? '' : 'none';

            if (!vanAktivKereses && csoport.classList.contains('tarolo')) {
                const lista = csoport.querySelector('.creator-list');
                const head = csoport.querySelector('.creator-head');
                const icon = csoport.querySelector('.toggle-icon');

                if (lista) lista.style.display = 'none';
                if (head) head.style.height = '8vh';
                if (icon) icon.style.transform = 'rotate(0deg)';
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

  const allowed = canUseGroupStatisticsFeature();
  const statBox = master.closest('#statisztika');

  const updateCounter = () => {
    const innerDiv = getErtekekInnerDiv();
    const count = innerDiv ? innerDiv.querySelectorAll('.cheking:checked').length : document.querySelectorAll('.cheking:checked').length;
    if (countSpan) countSpan.textContent = count;
  };

  const clearSelection = () => {
    const innerDiv = getErtekekInnerDiv();
    const boxes = innerDiv ? innerDiv.querySelectorAll('.cheking') : document.querySelectorAll('.cheking');
    boxes.forEach(el => {
      el.checked = false;
      el.style.display = 'none';
    });
    if (infoBox) infoBox.style.display = 'none';
    updateCounter();
  };

  if (!allowed) {
    master.checked = false;
    master.disabled = true;
    if (statBox) {
      statBox.dataset.groupStatsLocked = '1';
      statBox.style.opacity = '0.55';
      statBox.style.filter = 'grayscale(1)';
      statBox.style.cursor = 'not-allowed';
      if (!statBox.__groupStatsBlockedBound) {
        statBox.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          notifyGroupStatisticsBlocked();
        });
        statBox.__groupStatsBlockedBound = true;
      }
    }
    clearSelection();
    return;
  }

  master.disabled = false;

  const apply = () => {
    const show = master.checked;
    const innerDiv = getErtekekInnerDiv();

    if (infoBox) infoBox.style.display = show ? 'flex' : 'none';

    const boxes = innerDiv ? innerDiv.querySelectorAll('.cheking') : document.querySelectorAll('.cheking');
    boxes.forEach(el => {
      el.style.display = show ? 'block' : 'none';
      if (!show) el.checked = false;
    });

    updateCounter();
  };

  if (!master.__bound) {
      master.addEventListener('change', apply);
      master.__bound = true;
  }

  const innerDiv = getErtekekInnerDiv();
  if (innerDiv && !innerDiv.__boundCheking) {
      innerDiv.addEventListener('change', (e) => {
          if (e.target.matches('.cheking')) {
              if (!canUseGroupStatisticsFeature()) {
                e.target.checked = false;
                notifyGroupStatisticsBlocked();
                return;
              }
              updateCounter();
          }
      });
      innerDiv.__boundCheking = true;
  }

  apply();
}
//CSOPORTOSÍTÁS LOGIKA
function groupBySelect(type = 'role') {
  const innerDiv = getErtekekInnerDiv();
  if (!innerDiv) return;

  const tartok = [...innerDiv.querySelectorAll('.tart')];

  innerDiv.querySelectorAll('.csopi').forEach(e => e.remove());
  tartok.forEach(t => t.remove());

  const ma = new Date();
  ma.setHours(0, 0, 0, 0);

  const tegnap = new Date(ma);
  tegnap.setDate(ma.getDate() - 1);

  const hetEleje = new Date(ma);
  const nap = hetEleje.getDay();
  const hetfoEltolas = nap === 0 ? -6 : 1 - nap;
  hetEleje.setDate(hetEleje.getDate() + hetfoEltolas);
  hetEleje.setHours(0, 0, 0, 0);

  const elozoHonapEleje = new Date(ma.getFullYear(), ma.getMonth() - 1, 1);
  const aktualisHonapEleje = new Date(ma.getFullYear(), ma.getMonth(), 1);

  const felEvEleje = new Date(ma);
  felEvEleje.setMonth(felEvEleje.getMonth() - 6);
  felEvEleje.setHours(0, 0, 0, 0);

  const groupOrder = [
    'Ma-tegnap',
    'Ezen a héten',
    'Múlt hónapban',
    'Múlt félévben',
    'Régen'
  ];

  function normalizeDateValue(value) {
    if (value === null || value === undefined) return null;

    const raw = String(value).trim();
    if (!raw || raw === 'null' || raw === 'undefined' || raw === '0000-00-00' || raw === '0000-00-00 00:00:00') {
      return null;
    }

    const normalized = raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') : raw;
    const date = new Date(normalized);

    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  function getDateGroup(date) {
    if (!date) return 'Régen';

    const originalDate = normalizeDateValue(date);
    if (!originalDate) return 'Régen';

    const d = new Date(originalDate);
    d.setHours(0, 0, 0, 0);

    if (d.getTime() === ma.getTime() || d.getTime() === tegnap.getTime()) {
      return 'Ma-tegnap';
    }

    if (d >= hetEleje && d <= ma) {
      return 'Ezen a héten';
    }

    if (d >= elozoHonapEleje && d < aktualisHonapEleje) {
      return 'Múlt hónapban';
    }

    if (d >= felEvEleje && d < elozoHonapEleje) {
      return 'Múlt félévben';
    }

    return 'Régen';
  }

  function getCardDateValue(card, datasetName) {
    if (!card) return '';

    if (card.dataset[datasetName]) return card.dataset[datasetName];
    if (datasetName === 'modositvaRaw' && card.dataset.letrehozvaRaw) return card.dataset.letrehozvaRaw;

    return '';
  }

  function sortByDateDesc(items, datasetName) {
    return items.sort((a, b) => {
      const aCard = a.querySelector('.meglevok');
      const bCard = b.querySelector('.meglevok');

      const aDate = normalizeDateValue(getCardDateValue(aCard, datasetName));
      const bDate = normalizeDateValue(getCardDateValue(bCard, datasetName));

      const aTime = aDate ? aDate.getTime() : 0;
      const bTime = bDate ? bDate.getTime() : 0;

      return bTime - aTime;
    });
  }

  function createDateIntervalGroups(parent, items, datasetName = 'modositvaRaw') {
    const groups = new Map();

    groupOrder.forEach(title => {
      const csopi = document.createElement('div');
      csopi.classList.add('csopi', 'datum-intervallum-csopi');

      const fejlec = document.createElement('div');
      fejlec.classList.add('fejlec3', 'datum-intervallum-fejlec');

      const doboz = document.createElement('div');
      doboz.classList.add('doboztart', 'datum-intervallum-doboztart');

      csopi.append(fejlec, doboz);

      groups.set(title, {
        csopi,
        fejlec,
        doboz,
        count: 0,
        items: []
      });
    });

    items.forEach(tart => {
      const card = tart.querySelector('.meglevok');
      if (!card) return;

      const rawDate = getCardDateValue(card, datasetName);
      const groupTitle = getDateGroup(rawDate);
      const group = groups.get(groupTitle) || groups.get('Régen');

      if (!group) return;

      group.items.push(tart);
      group.count += 1;
    });

    groupOrder.forEach(title => {
      const group = groups.get(title);
      if (!group || group.count === 0) return;

      sortByDateDesc(group.items, datasetName).forEach(tart => {
        group.doboz.appendChild(tart);
      });

      group.fejlec.textContent = `${title} (${group.count})`;
      parent.appendChild(group.csopi);
    });
  }

  if (type === 'letrehozva') {
    createDateIntervalGroups(innerDiv, tartok, 'letrehozvaRaw');
    return;
  }

  if (type === 'modositva') {
    createDateIntervalGroups(innerDiv, tartok, 'modositvaRaw');
    return;
  }

  if (type === 'role' || type === 'role2') {
    const groups = new Map();

    tartok.forEach(tart => {
      const card = tart.querySelector('.meglevok');
      const owner = (card?.dataset.owner || 'Ismeretlen').trim();

      if (!groups.has(owner)) {
        const csopi = document.createElement('div');
        csopi.classList.add('csopi', 'tulaj-csopi');

        const fejlec = document.createElement('div');
        fejlec.classList.add('fejlec2', 'tulaj-fejlec');

        const doboz = document.createElement('div');
        doboz.classList.add('doboztart', 'tulaj-doboztart');

        csopi.append(fejlec, doboz);

        groups.set(owner, {
          csopi,
          doboz,
          fejlec,
          count: 0,
          title: owner,
          items: []
        });
      }

      const group = groups.get(owner);
      group.items.push(tart);
      group.count += 1;
    });

    const sortedKeys = [...groups.keys()].sort((a, b) => {
      if (a === 'Saját értékelések') return -1;
      if (b === 'Saját értékelések') return 1;
      return a.localeCompare(b, 'hu');
    });

    sortedKeys.forEach(key => {
      const group = groups.get(key);
      if (!group) return;

      group.fejlec.textContent = `${group.title} (${group.count})`;
      createDateIntervalGroups(group.doboz, group.items, 'modositvaRaw');
      innerDiv.appendChild(group.csopi);
    });

    return;
  }

  const groups = new Map();

  tartok.forEach(tart => {
    const card = tart.querySelector('.meglevok');
    const key = (card?.dataset[type] || 'Ismeretlen').trim();

    if (!groups.has(key)) {
      const csopi = document.createElement('div');
      csopi.classList.add('csopi');

      const fejlec = document.createElement('div');
      fejlec.classList.add('fejlec2');

      const doboz = document.createElement('div');
      doboz.classList.add('doboztart');

      csopi.append(fejlec, doboz);
      groups.set(key, { csopi, doboz, fejlec, count: 0, title: key, items: [] });
    }

    const group = groups.get(key);
    group.items.push(tart);
    group.count += 1;
  });

  groups.forEach(group => {
    group.fejlec.textContent = `${group.title} (${group.count})`;
    group.items.forEach(tart => group.doboz.appendChild(tart));
    innerDiv.appendChild(group.csopi);
  });
}
//Szűrő
export function initSzuro() {
  if (!document.getElementById('foglalt')) return;
  const sel = document.getElementById('szuro');
  if (!sel) return;
  groupBySelect(sel.value);
  sel.addEventListener('change', e => groupBySelect(e.target.value));
}
