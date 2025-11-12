// Admin teendők js fájl. - témakörök szerkesztése, felhasználók felügyelése. Tovább bontom (color,role)
import { loadInfoAndInit } from '../info/infoLoader.js'; 
import { renderRoles } from './dashAroles.js';
import{anyColorToHex, bindNewColorPickers} from './dashAcolor.js';
import{initAside}from'../user/dashAside.js'
const styleTag = document.createElement('style');   // ennyi elég

initAside();
document.head.appendChild(styleTag);
document.addEventListener('DOMContentLoaded', () => {
  const box = document.getElementById('joglecsuk');
  if (!box) return console.warn('#joglecsuk nem található');

  // megjegyezzük a doboz tényleges magasságát (egyszer)
  const fullHeight = box.scrollHeight + 'px';
  box.style.minHeight = '40px'
  box.style.maxHeight = fullHeight;   // ráírjuk, hogy nyitva ennyi

  // kattintásra váltunk
  box.addEventListener('click', () => {
    box.classList.toggle('closed');            // CSS-klassz kapcsol
    box.style.maxHeight = box.classList.contains('closed') ? '40px' : fullHeight;
  });
});

// 3. Feldobjuk a <head>-be
const userState = {
  modulId:       null,
  modulNev:      null,
  modulLeiras:   null,
  userId:        null,
  userName:      null,
  fullname:      null,
  intezmeny_id:  null,
  intezmeny_nev: null
};
const lapozo = document.querySelector("#lapozo");
const sta = document.querySelector(".sta");
const grap = document.querySelector(".grap");
const gyik = document.querySelector("#gyik")

lapozo.addEventListener('click', (e) => {
  if (e.target.classList.contains('grap') || e.target.classList.contains('sta') || e.target.classList.contains('gyik'))  {
    // Aktiv osztály váltása.
    [...lapozo.children].forEach(child => child.classList.remove('aktiv'));
    e.target.classList.add('aktiv');

    // Megjelenítés logika||
    if (e.target.classList.contains('grap')) {
      maininf.style.display = 'flex';
      osszesitett.style.display = 'none';
      bindNewColorPickers();         // <- itt!
      gyik.style.display="none";
    } else if (e.target.classList.contains('gyik')) {
      maininf.style.display = 'none';
      osszesitett.style.display = 'none';
      gyik.style.display="flex";
    } 
    else if (e.target.classList.contains('sta')) {
        maininf.style.display = 'none';
        osszesitett.style.display = 'flex';
        gyik.style.display="none";
    }
  }
});
const userLoaded = (async () => {
  try {
    const res  = await fetch('/get-username');
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    // Feltöltjük a state-et
    Object.assign(userState, {
      userId:        data.id,
      fullname:      data.vez,
      userName:      data.username,
      modulId:       data.modulId,
      modulNev:      data.modulNev,
      modulLeiras:   data.modulLeiras,
      intezmeny_id:  data.int_id,
      intezmeny_nev: data.intnev
    });

    // Opcionális DOM-frissítés itt is elvégezhető
    const sajtnevElem = document.querySelector('#sajatnev');
    if (sajtnevElem) sajtnevElem.innerHTML = "&nbsp;" + data.username;

    const holvagyElem = document.querySelector('.holvagyok');
    if (holvagyElem) holvagyElem.innerHTML = data.modulLeiras;

    return userState;
  } catch (err) {
    console.error('Felhasználó betöltése sikertelen:', err);
    throw err;
  }
})();

loadInfoAndInit();

//Alapadatok betöltése
userLoaded
  .then(() => {
    console.log('modulId:',      userState.modulId);
    console.log('intezmeny_id:', userState.intezmeny_nev);
    console.log('userName:',     userState.userName);    

    if (userState.modulNev === 'admin') {
      const gomb = document.getElementById('generateSzazalekBtn');
      if (gomb) gomb.style.display = 'block';
    }
  })
  .catch(() => {
  });
 
//Adatbázis százalékos frissítés  
document.getElementById('ujraszamolas-gomb').addEventListener('click', () => {
    fetch('/api/frissit-minden-ossz-ertek', {
        method: 'POST'
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById('ujraszamolas-eredmeny').innerText = data.message || 'Sikeres frissítés.';
    })
    .catch(err => {
        document.getElementById('ujraszamolas-eredmeny').innerText = 'Hiba történt.';
        console.error(err);
    });
});
//Kategória + Menü
const plusz = document.querySelector("#plussz")
plusz.addEventListener('click', () => {
  document.querySelector(".grap").classList.add("aktiv");
  document.querySelector(".gyik").classList.remove("aktiv");
  document.querySelector(".sta").classList.remove("aktiv");
  document.querySelector("#maininf").style.display="flex";
  document.querySelector("#gyik").style.display="none";
  document.querySelector("#osszesitett").style.display="none";
  document.querySelector('#szekcio-3')
  document.querySelector(".diag").scrollIntoView({ behavior: 'smooth', block: 'start' });
});
//Témakörök lekérése
  async function loadTemaLookup(modulId) {
    const resp = await fetch('/private/info/temakorok.json'); 
    if (!resp.ok) throw new Error(`temakorok.json HTTP ${resp.status}`);
    const all = await resp.json();
    const set = (all.optionSets && all.optionSets[String(modulId)]) || [];
    const filtered = set.filter(o => typeof o.value === 'string' && o.value.trim() !== '');
    return new Map(filtered.map(o => [o.value, o])); 
  }
function waitFor(selector, cb) {
  const el = document.querySelector(selector);
  if (el) { cb(el); return; }
  const mo = new MutationObserver(() => {
    const found = document.querySelector(selector);
    if (found) { mo.disconnect(); cb(found); }
  });
  mo.observe(document.body, { childList: true, subtree: true });
}
  userLoaded.then(async () => {
    
  try {
 // 1) DB számok
    const res = await fetch(`/fo-szam?modulId=${encodeURIComponent(userState.modulId)}`);
    if (!res.ok) throw new Error(`HTTP hiba: ${res.status}`);
    const dbJson = await res.json();
    const dbArr  = dbJson.data || [];

    // 2) temakorok.json
    const temaLookup = await loadTemaLookup(userState.modulId);
    const jsonNames  = Array.from(temaLookup.keys());

    // 3) összeolvasztás
    const mapByName = new Map(dbArr.map(o => [o.category, o.questions_count]));
    jsonNames.forEach(n => { if (!mapByName.has(n)) mapByName.set(n, 0); });

    // 4) lista (ha létezik a cél lista)
    const listEl = document.getElementById('fo-kategoriak-list');
    if (listEl) {
      listEl.innerHTML = '';
      if (mapByName.size === 0) {
        listEl.innerHTML = '<li>Nincsenek fő kategóriák.</li>';
      } else {
        mapByName.forEach((count, cat) => {
          const li = document.createElement('li');
          li.textContent = `${cat}: ${count} kérdés`;
          listEl.appendChild(li);
        });
      }
    }

 waitFor('#jelenlegi', (jelenlegi) => {
  document.getElementById('confirmNew').addEventListener('click', async () => {
  
  const nev      = document.getElementById('newcim').value.trim();
  const leiras   = document.getElementById('newleiras').value.trim();
const szin = document.getElementById('nf_szin').value;
  const chartHex = document.getElementById('fm_chart_color').value;
  const modulId  = userState.modulId;

  /* 1) névütközés kliens-oldalon */
  const meglevok = JSON.parse(
    document.querySelector('#jelenlegi').dataset.meglevok || '[]'
  );
  if (meglevok.map(n => n.toLowerCase()).includes(nev.toLowerCase())) {
    alert('Már létezik ilyen főkategória.');
    return;
  }


const payload = {
  modulId,
  nev,
  leiras,
  szin: szin, // Régi 'gradient' változó helyett
  chart: chartHex
};

  try {
    const res = await fetch('/add-temakor', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    /* siker: frissítsd a listát vagy reload */
    location.reload();
  } catch (e) {
    alert('Mentés sikertelen: ' + e.message);
  }
});
      // dataset a duplikátum-ellenőrzéshez
      jelenlegi.dataset.meglevok = JSON.stringify([...mapByName.keys()]);

      // mini-kártyák (bal oszlop)
      const leftCol = document.querySelector('#jelenlegi > div')?.children?.[0];
      if (leftCol) {
        leftCol.innerHTML = '';
        mapByName.forEach((_, catName) => {
          const match = temaLookup.get(catName);
          const card  = document.createElement('div');
          card.className = 'fo-mini';
          card.style.boxShadow = '0 0 5px 2px #666';
          if (match?.szin)  card.style.background = match.szin;
          card.dataset.foKategoria = catName;
          card.dataset.chartColor  = match?.chart ? anyColorToHex(match.chart) : '#666666';

          const cim   = document.createElement('div');
          cim.className = 'cim';
          const cimText = document.createElement('span');
          cimText.className = 'cim-text';
          cimText.textContent = catName;
          const edit = document.createElement('span');
          edit.className = 'edit-button';
          edit.innerHTML = '<span class="material-symbols-rounded">edit</span>';
          cim.append(cimText, edit);

          const leir = document.createElement('div');
          leir.className = 'leiras';
          leir.textContent = match?.leiras || '';

          card.append(cim, leir);
          leftCol.appendChild(card);
        });
      }

      // szerkesztő bekapcsolása akkor, amikor már tényleg létezik
      bekapcsolFoMiniSzerkeszto?.();
    });

 
// Új létrehozás

      // Szerkesztés elindítása
    function bekapcsolFoMiniSzerkeszto() {
        const jelenlegi = document.querySelector('#jelenlegi');
        if (!jelenlegi) return;
        if (jelenlegi.dataset.foMiniModalBound === '1') return;
        jelenlegi.dataset.foMiniModalBound = '1';

          const modal     = document.getElementById('confirmModal');
          const modalText = document.getElementById('modalText');
          const yesBtn    = document.getElementById('confirmYes');
          const noBtn     = document.getElementById('confirmNo');
          if (!modal || !modalText || !yesBtn || !noBtn) return;

            const escapeHTML = s => String(s ?? '')
              .replace(/&/g,'&amp;').replace(/</g,'&lt;')
              .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
              .replace(/'/g,'&#039;');

            jelenlegi.addEventListener('click', (e) => {
              const kartya = e.target.closest('.fo-mini');
              if (!kartya || !jelenlegi.contains(kartya)) return;

              const cimTextEl  = kartya.querySelector('.cim .cim-text');
              const leirasDiv  = kartya.querySelector('.leiras');
              const aktualisCim    = kartya.dataset.foKategoria || (cimTextEl?.textContent.trim() || '');
              const aktualisLeiras = leirasDiv ? leirasDiv.textContent.trim() : '';
              console.log(aktualisLeiras)

              modalText.innerHTML = `
                <span class="figyel">Jelenleg egy meglévő főtémakört próbál szerkeszteni vagy törölni, ezért járjon el körültekintően. <br> A változtatások minden lejebb lévő témakörre és kérdésre hatással lesznek. </span>
                <div class="modalinfo">
                <div class="modalblock"> 
                    <p> Főkategória szerkesztése</p>
                      <div>
                        <label for="fm_cim">  <b>Főkategória neve</b></label>
                        <input id="fm_cim" type="text" value="${escapeHTML(aktualisCim)}"style="width:100%;padding:3px;border:1px solid #ccc;border-radius:6px">
                      </div>
                      <div style="margin-bottom:10px">
                        <label for="fm_leiras"><b>Leírás</b></label>
                        <textarea id="fm_leiras" rows="2">${escapeHTML(aktualisLeiras)}</textarea>
                      </div>
                       <div class="szinek">
                          <div style="margin:0px"><b> Főkategória színe</b></div>
                          <div>
                            <label>Szín <input id="fm_szin" type="color" value="#cccccc"></label>
                          </div>
                          <div id="fm_szin_preview" class="szin-preview">${aktualisCim}</div>
                        </div>
                        <div class="chart">
                          <div style="margin:0"><b>Diagram színe</b></div>
                          <div style="    display: flex; margin:0px !important; justify-content: space-between; align-items: center;">
                          <div>
                            <label>Szín <input id="fm_chart_color" type="color" value="#666666"></label>
                          </div>
                          <div id="nf_chart_preview" class="szin-preview">100%</div>
                        </div>
                    </div>
                </div>
                <div class="modalblock outer-div" style="width:50%">
                    <p>Főkategóriához tartozó leágazások</p>
                </div>
              `;
          modal.classList.remove('hidden');
          modal.classList.add('active');
          const deletetema = document.createElement("span");
          deletetema.classList.add("material-symbols-rounded");
          deletetema.innerHTML=`delete`;
          const modalbuttons=  document.querySelector(".modal-buttons");
          modalbuttons.appendChild(deletetema);

          const originalBg = kartya.style.background;
          const eredetiCim = aktualisCim; // <<< EREDTI NÉV, AZONOSÍTÁSRA

          //Témakör9k adatai
          function renderAgakLista(container, faAdat) {
            if (!container) return;
            if (!faAdat || faAdat.length === 0) {
              container.innerHTML = '<div style="color:#666;">Nincs adat ehhez a főkategóriához.</div>';
              return;
            }
            const wrap = document.createElement('div');
            wrap.className = 'agak-lista';
            faAdat.forEach(node => {
              const ak = document.createElement('div');
              ak.className = 'ag-sor';
              ak.style.margin = '6px 0';

              const akCim = document.createElement('div');
            akCim.classList.add("agcim")
              akCim.textContent = node.al_kategoria;

              const ul = document.createElement('ul');
              ul.style.margin = '4px 0 0 12px';

              node.alt_temak.forEach(at => {
                const li = document.createElement('li');
                li.style.margin = '2px 0';
                li.innerHTML = `<span style="font-weight:bold"> ${at.alt_tema}</span> 
                <br>
                <span style="font-style:italic"> Rögzített kérdések: </span><span style="font-weight:bold;font-style:italic " > ${at.rogzitett_db} darab </span> `;
                ul.appendChild(li);
              });

              ak.appendChild(akCim);
              ak.appendChild(ul);
              wrap.appendChild(ak);
            });
            container.innerHTML = '';
            container.appendChild(wrap);
          }
          const modalInfo = modalText.querySelector('.modalinfo');
          const blocks = modalInfo?.querySelectorAll('.modalblock');
          const leagazasBlock = blocks && blocks[1]; // 2. blokk: "Főkategóriához tartozó leágazások"
          if (leagazasBlock) {
            let target = leagazasBlock.querySelector('.agak-container');
            if (!target) {
              target = document.createElement('div');
              target.className = 'agak-container';
              target.classList.add("inner-div")            
              leagazasBlock.appendChild(target);
            }
            // adatlekérés
            (async () => {
              try {
                const url = `/agak?modulId=${encodeURIComponent(userState.modulId)}&fo=${encodeURIComponent(aktualisCim)}`;
                const resp = await fetch(url);
                const json = await resp.json();
                if (!json.success) {
                  target.innerHTML = '<div style="color:#b00;">Hiba történt az ágak lekérdezésekor.</div>';
                  return;
                }
                renderAgakLista(target, json.data);
              } catch (e) {
                console.error(e);
                leagazasBlock.innerHTML = '<div style="color:#b00;">Szerverhiba az ágak lekérdezésekor.</div>';
              }
            })();
          }
        //Színek
        const currentColorHex = anyColorToHex(kartya.style.background || getComputedStyle(kartya).backgroundColor);

       
// Majd a teljes régi színkezelő logikát (a 'Színek' komment alatti részt) CSERÉLD LE erre:
const szinInput = document.getElementById('fm_szin');
const prev      = document.getElementById('fm_szin_preview');

if (szinInput) szinInput.value = currentColorHex;
if (prev) prev.style.background = currentColorHex;

const apply = () => {
    const newColor = szinInput.value;
    if (prev) prev.style.background = newColor;
    kartya.style.background = newColor; // Élő frissítés a kártyán
};

// Élő frissítés input közben
['input', 'change'].forEach(evt => {
    szinInput?.addEventListener(evt, apply);
});
          // élő frissítés input közben
          ['input','change'].forEach(evt => {
          szinInput?.addEventListener(evt, apply);
          });
          const chartInput = document.getElementById('fm_chart_color');
          const chartPrev  = document.getElementById('fn_chart_preview');
          let chartSeed = kartya.dataset.chartColor || '#666666';
          chartInput.value = anyColorToHex(chartSeed);
          if (chartPrev) chartPrev.style.background = chartInput.value;
          // élő frissítés + mentés a kártya datasetjébe
          const applyChart = () => {
            const hex = chartInput.value;
            chartPrev.style.background = hex;
            kartya.dataset.chartColor = hex;
          };
          chartInput.addEventListener('input', applyChart);
          chartInput.addEventListener('change', applyChart);
          
          // Gombok: Mentés/Elvetés
yesBtn.onclick = async () => {
  const ujCim    = document.getElementById('fm_cim').value.trim();
  const ujLeiras = document.getElementById('fm_leiras').value.trim();

  // DOM frissítés, ahogy eddig …

  const adat = {
    modulId:     userState.modulId,
    eredetiNev:  aktualisCim,
    ujNev:       ujCim,
    leiras:      ujLeiras,
    szin:        kartya.style.background,
    chart:       kartya.dataset.chartColor
  };

  try {
   const res = await fetch('/update-temakor', {
  method : 'POST',
  headers: { 'Content-Type': 'application/json' },
  body   : JSON.stringify(adat)
});
    if (!res.ok) {
      console.error('HTTP', res.status);
      alert('Mentési hiba (' + res.status + ').');
      return;
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      console.error('Nem JSON:', await res.text());
      alert('A szerver nem JSON-t küldött.');
      return;
    }
    const json = await res.json();
    if (!json.success) {
      alert('Mentési hiba: ' + (json.message || 'ismeretlen'));
      return;
    }
    modal.classList.add('hidden');   // siker
  } catch (e) {
    console.error(e);
    alert('Szerverhiba mentés közben.');
  }
};

          const originalChart = chartSeed;
          const prevNo = noBtn.onclick;
          noBtn.onclick = () => {
            kartya.style.background = originalBg || '';
            modal.classList.add('hidden');
            kartya.dataset.chartColor = originalChart;
            if (chartPrev) chartPrev.style.background = originalChart;
            prevNo?.();
          };
              setTimeout(() => document.getElementById('fm_cim')?.focus(), 0);
            }, false);
    }
    
    bekapcsolFoMiniSzerkeszto();
    } catch (err) {
      console.error('Hiba a fő kategóriák vagy temakorok.json betöltésekor:', err);
    }
  });

  //Jogosultságok kiosztása
  userLoaded.then(() => {
    renderRoles(userState);
  });
