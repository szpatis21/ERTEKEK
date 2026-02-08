//Statisztika, grafikonok, és összevont táblázat
import {fullname,felbukkano2,felbukkano4,felbukkano3,modulId } from './dashMain.js'
import { KategoriaKezelo } from '../main/main_quest.js';
import { kerdesValaszok,szovegesValaszok,betoltKategoriakChartSzinek} from '../main/main_alap.js';
import { szamoljFokerdesOsszErtek,letrehozFoKategoriaChart,kiszamoltFoKategoriaDiagramAdatok,letrehozAlkategoriaChart,letrehozAltTemaChart,  } from '../main/szamitasok.js';

const TEMAKOROK_URL = '/private/info/temakorok.json'; //Témakörök
const kijelolt = []; //Diagrammok gyűjtője
const atlagolt = [];  //Diagrammok átlaga
const levelClasses = ['lvl0', 'lvl1', 'lvl2'];
let _szinCache = new Map();
let megtekintesMod = false;
let osszehasonlitoDiagramInstance = null;

// Témakörök színei

// Kiemeltük a függvényt a modul gyökerébe, hogy máshol is elérhető legyen
const toAlpha = (rgba, a) => {
    // rgba(r,g,b,x) → rgba(r,g,b,a)
    if (typeof rgba !== 'string') return null;
    const m = rgba.match(/rgba?\((\s*\d+\s*,\s*\d+\s*,\s*\d+)(?:\s*,\s*[\d.]+)?\)/i);
    return m ? `rgba(${m[1]}, ${a})` : rgba;
  };


// dashStatic.js

async function temaChecklistLetrehoz(kijeloltTomb) {
  const container = document.getElementById('tema-valaszto-container');
  if (!container) return;

  // Összegyűjtjük az összes egyedi főkategóriát
  const temaSet = new Set();
  kijeloltTomb.forEach(item => {
    const fokategoriak = extractTopLevelPercents(item.szazalek); // Ez a függvény már létezik nálad
    Object.keys(fokategoriak).forEach(tema => temaSet.add(tema));
  });

  // Rendezés marad
const rendezettTemak = Array.from(temaSet).sort((a, b) => a.localeCompare(b, 'hu'));
// Betöltjük a szín-hozzárendeléseket
const { chartMap } = await loadColorMaps(modulId);

// (Opcionális) biztonságos kiíráshoz
const escapeHtml = s => String(s)
  .replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

// HTML felépítése: h4 + külön konténer a checkboxoknak + gomb
let checklistHTML = `
  <div class="tema-valaszto">
    <h4 id="temak-cim">Válassza ki a témákat az összehasonlításhoz:</h4>
    <div class="temak-container" role="group" aria-labelledby="temak-cim">
`;

rendezettTemak.forEach((tema, idx) => {
  const temaId = `tema-${tema.replace(/[^a-zA-Z0-9]/g, '-')}`;
  const baseColor = chartMap[tema]?.trim() || RADAR_BASE[idx % RADAR_BASE.length];
  const bgColor = toAlpha(baseColor, 0.25); // Áttetsző háttérszín
  
  checklistHTML += `
    <label class="tema-checkbox" for="${temaId}" style="background-color: ${bgColor}; border-left: 5px solid ${baseColor};">
      <input type="checkbox" id="${temaId}" name="tema" value="${escapeHtml(tema)}" checked>
      <span class="tema-felirat">${escapeHtml(tema)}</span>
    </label>
  `;
});
checklistHTML += `</div></div>`; // Lezárjuk a diveket

container.innerHTML = checklistHTML;

const temakBox = container.querySelector('.temak-container');
  if (temakBox) {
    temakBox.addEventListener('change', (e) => {
      if (e.target && e.target.matches('input[name="tema"]')) {
        // async függvény, de event handlerből hívható
        vonalDiagramFrissites();
      }
    });
  }


  vonalDiagramFrissites();
}

async function vonalDiagramFrissites() {

  const labels = kijelolt.map(ertekeles => ertekeles.periodus || 'Névtelen értékelés');

  const kivalasztottTemak = [];
  document
    .querySelectorAll('#tema-valaszto-container input[name="tema"]:checked')
    .forEach(cb => kivalasztottTemak.push(cb.value));

  if (kivalasztottTemak.length === 0 || kijelolt.length === 0) return;

  // temakorok.json → chartMap
  const { chartMap } = await loadColorMaps(modulId); // modulId már globálban elérhető

  const datasets = kivalasztottTemak.map((tema, idx) => {
    const data = kijelolt.map(ertekeles => {
      const top = extractTopLevelPercents(ertekeles.szazalek);
      return top[tema] || 0;
    });

    // Preferált kategória-szín a temakorok.json alapján, egyébként fallback a RADAR_BASE
    const base = chartMap[tema]?.trim() || RADAR_BASE[idx % RADAR_BASE.length];
    const borderColor = toAlpha(base, 1) || base;
    const backgroundColor = toAlpha(base, 0.18) || base;

    return {
      label: tema,
      data,
      borderColor,
      backgroundColor,
      fill: true,
      tension: 0.35,
      pointRadius: 3,
      pointBackgroundColor: borderColor,
      borderWidth: 2,
    };
  });

  vonalDiagramRajzol(labels, datasets);
}

// dashStatic.js

function vonalDiagramRajzol(labels, datasets) {
  const ctx = document.getElementById('osszehasonlitoVonaldiagram')?.getContext('2d');
  if (!ctx) return;
  
  if (osszehasonlitoDiagramInstance) {
    osszehasonlitoDiagramInstance.destroy();
  }
  
  osszehasonlitoDiagramInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }, // <<< LEGENDA KIKAPCSOLVA
        title: {
          display: true,
          text: 'Értékelések profiljának összehasonlítása'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Eredmény (%)'
          }
        }
      }
    }
  });
}
export async function loadColorMaps(modulId) {
  const key = String(modulId);
  if (_szinCache.has(key)) return _szinCache.get(key);

  const res = await fetch(TEMAKOROK_URL);
  if (!res.ok) throw new Error('temakorok.json nem elérhető');
  const data = await res.json();

const set = (data.optionSets && data.optionSets[key]) || [];
const chartMap = {};
const bgMap = {};

for (const o of set) {
  if (!o) continue;
  const names = [o.value, o.text].filter(Boolean).map(s => s.trim());
  for (const name of names) {
    chartMap[name] = o.chart || 'rgba(160,160,160,0.6)';
    bgMap[name]    = o.szin  || 'linear-gradient(0deg, rgba(160,160,160,0) 0%, rgba(160,160,160,1) 100%)';
  }
}

  const out = { chartMap, bgMap };
  _szinCache.set(key, out);
  return out;
}
//Mérések színei
const RADAR_BASE = [
  'rgb(194,24,91)',
    'rgb(209, 221, 76)',
  'rgb(76,154,221)',
  'rgb(255,122,0)',
  'rgb(156,204,101)',
  'rgb(255,59,59)',
  'rgb(142,101,255)',
  'rgb(38,198,218)',
  'rgb(216,67,21)'
];

//Kezdeti diagrammok
let szummChartInstance = null;
let szummRadarInstance = null;  
let szummMultiPieInstance = null;  
let szummPolarInstance = null;  

//Fehér gyűrű a mulithoz
const ringSeparator = {
  id: 'ringSeparator',
  afterDatasetsDraw(chart) {
    const {ctx} = chart;
    ctx.save();
    ctx.lineWidth = 4;           // rés vastagsága
    ctx.strokeStyle = '#fff';

    chart.data.datasets.forEach((_, i) => {
      const {x, y, outerRadius} = chart.getDatasetMeta(i).data[0];
      ctx.beginPath();
      ctx.arc(x, y, outerRadius, 0, 2 * Math.PI);
      ctx.stroke();
    });

    ctx.restore();
  }
};
// Színek rgb-be radarhoz
function rgbToRgba(rgb, alpha = 0.2) {
  return rgb.replace(/^rgb\(([^)]+)\)$/, `rgba($1,${alpha})`);
}
// Átlagszámoló
function averageEvaluations(list) {
  // Ha 5-ből 3 fő is elég,  0.6-ra. (most 5-ből pl 4)
  const MIN_REPRESENTATION_RATIO = 0.6;

  if (!list.length) return {};

  const sums = {}; // összeg
  const counts = {}; // hányszor fordult elő
  const totalCount = list.length; // A teljes csoportméret.

  list.forEach(obj => accumulate(obj, sums, counts));

  // <<< MÓDOSÍTOTT HÍVÁS: Átadjuk a teljes létszámot is.
  return buildAvg(sums, counts, totalCount);

  function accumulate(src, S, C) {
    for (const k in src) {
      const v = src[k];
      if (v && typeof v === 'object') {          // fastruktúra
        S[k] = S[k] || {};
        C[k] = C[k] || {};
        accumulate(v, S[k], C[k]);
      } else if (typeof v === 'number') {        // levél
        S[k] = (S[k] || 0) + v;
        C[k] = (C[k] || 0) + 1;
      }
    }
  }


  //Megkapja a teljes létszámot (total).
  function buildAvg(S, C, total) {
    const out = {};
    for (const k in S) {
      if (typeof S[k] === 'object') {
        const child = buildAvg(S[k], C[k], total); // <<< rekurzív hívásban is átadjuk
        if (Object.keys(child).length) out[k] = child;
      } else {
        // Ellenőrizzük, hogy az adott kategóriában elegendő adat van-e.
        const representation = C[k] / total;
        if (representation < MIN_REPRESENTATION_RATIO) {
          continue; // Ha nincs elég adat, kihagyjuk ezt a kategóriát.
        }

        const avg = Math.round(S[k] / C[k]);
        if (avg) out[k] = avg;
      }
    }
    return out;
  }
}
//Felirat sorköz
function torjFeliratot(label, hossz = 5) {
  if (label.length <= hossz) return [label];   // <<< mindig tömb
  const szavak = label.split(/\s+/);
  const sorok = [];
  let aktualis = '';
  for (const szo of szavak) {
    if ((aktualis + ' ' + szo).trim().length <= hossz) aktualis += ' ' + szo;
    else { if (aktualis) sorok.push(aktualis.trim()); aktualis = szo; }
  }
  if (aktualis) sorok.push(aktualis.trim());
  return sorok;
}
// determinisztikus címke-gyűjtés és dataset-készítés
function radarAdatokKijeloltből(results) {
  const labelSet = new Set();

  results
    .filter(r => r && r.szazalek)
    .forEach(r => Object.keys(r.szazalek).forEach(k => labelSet.add(k)));

  // 1) nyers kulcsok (lookuphoz)
  const rawLabels = Array.from(labelSet).sort((a,b) => a.localeCompare(b, 'hu'));
  // 2) tördelve a megjelenítéshez
  const displayLabels = rawLabels.map(l => torjFeliratot(l));

  const datasets = results.map((r, i) => {
    const data = rawLabels.map(k => {         
      const v = r.szazalek[k];
      if (v == null) return 0;
      if (typeof v === 'object') return Number(v['%'] ?? v.percent ?? 0) || 0;
      return Number(v) || 0;
    });

    const col = RADAR_BASE[i % RADAR_BASE.length];
    const bg  = rgbToRgba(col);   //  áttetsző háttér

    return {
      label: (r.nev || '').split(/\s*-\s*/)[0].trim() || `#${i+1}`,
      data,
      borderColor: col,
  backgroundColor: bg,
      pointBackgroundColor: col,
      borderWidth: 2,
      fill: true,
      spanGaps: true
    };
  });

  return { labels: displayLabels, datasets };
}

function extractTopLevelPercents(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v && typeof v === 'object' && typeof v['%'] === 'number') out[k] = v['%'];
  }
  return out;
}

//Multi Series Pie frissítő
async function updateMultiSeriesPie(kijeloltTomb, chartMap = {}) {
  const canvas = document.getElementById('multiPie');
  if (!canvas) return;

  // 1) címkék uniója (főkategória szint)
  const union = new Set();
  const rows = kijeloltTomb.map(x => extractTopLevelPercents(x.szazalek));
  rows.forEach(r => Object.keys(r).forEach(k => union.add(k)));
  const labels = Array.from(union).sort((a,b)=> a.localeCompare(b,'hu'));

  // 2) kategória-színek a temakorok.json alapján (fallback szürke)
  const catColors = labels.map(l => (chartMap[l]?.replace?.(/,?\s*0\.\d+\)/, ', 0.6)') || 'rgba(160,160,160,0.6)'));
  const catBorders = catColors.map(c => c.replace('0.6', '1'));

  // 3) datasetek (minden kijelölt értékelés külön gyűrű)
  const datasets = rows.map((r, i) => {
    const data = labels.map(l => Number(r[l] ?? 0));
    const ringBorder = RADAR_BASE[i % RADAR_BASE.length]; // személy színe (gyűrű pereme)
    return {
      label: (kijeloltTomb[i].nev || `#${i+1}`),
      data,
      backgroundColor: catColors,        // kategória szerinti színek
      borderColor: ringBorder,           // személy szerinti peremszín
      borderWidth: 4,
      borderAlign: 'inner',
      hoverOffset: 2,
      spacing: 0
    };
  });

  // 4) létrehoz / frissít
 const ctx = canvas.getContext('2d');
canvas.style.height = '360px';
if (!szummMultiPieInstance) {
  szummMultiPieInstance = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets },
      plugins: [ ringSeparator ],      // ← végre jó helyen

    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: 0 },
      cutout: '25%',
      plugins: {
          plugins: [ ringSeparator ],      // ← csak erre a példányra hat

        legend: { display: false },        // ⬅️ kiiktattuk a gyárit
      }
    }
  });
} else {
  szummMultiPieInstance.data.labels = labels;
  szummMultiPieInstance.data.datasets = datasets;
  szummMultiPieInstance.update();
}
  const pieLeg = document.getElementById('pieLegend');
if (pieLeg) {
  pieLeg.innerHTML = labels.map((lab, i) => `
    <span class="legend-item" style="background:${catColors[i]}">
      ${lab}
    </span>
  `);
}
}
//Radar frissítő
function frissitsRadar(kijeloltTomb) {
  const ctx = document.getElementById('szummRadarChart')?.getContext('2d');
  if (!ctx) return;

  const { labels, datasets } = radarAdatokKijeloltből(kijeloltTomb);

  if (!szummRadarInstance) {

    szummRadarInstance = new Chart(ctx, {
      type: 'radar',
      data: { labels, datasets },
      
      options: {
        
        responsive: true,
        layout: { padding: 0 },
        maintainAspectRatio: false,
        elements: { line: { tension: 0.2 } },
        plugins: { legend: { display: false } },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            
            ticks: { stepSize: 20 },
            pointLabels: {
              font: { size: 15 }
            }
          }
        }
      }
    });
  } else {
    szummRadarInstance.data.labels = labels;
    szummRadarInstance.data.datasets = datasets;
    szummRadarInstance.update();
  }

  // legenda frissítése
  const legendDiv = document.getElementById('radarLegend');
  if (legendDiv) {
    legendDiv.innerHTML = '';
    datasets.forEach(ds => {
      const badge = document.createElement('div');
      badge.className = 'legend-badge';
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.background = ds.borderColor;
      const txt = document.createElement('span');
      txt.textContent = ds.label;
      badge.appendChild(swatch);
      badge.appendChild(txt);
      legendDiv.appendChild(badge);
    });
  }
}
// Táblázat generátor
function renderSummaryTree(jsonObj, targetSel = '#szumm-fa') {
  const target = document.querySelector(targetSel);
  if (!target) return;
  target.innerHTML = '';

  /* ---- levelek kigyűjtése ---- */
  const leaves = [];
  (function walk(node, path = []) {
    for (const [key, val] of Object.entries(node)) {
   if (typeof val === 'number') {
  if (val === 0) continue;            // ← 0-ás levelek nem kellenek
  leaves.push([...path, { key, pct: val }]);
  continue;
}

const pct = (typeof val['%'] === 'number') ? val['%'] : null;
if (pct === 0) continue;              // 0-ás belső csomópontot is ugorjuk

      const next = val.alkategoriak || val.altTemak ||
                   Object.fromEntries(Object.entries(val).filter(([k]) => k !== '%'));
      walk(next, [...path, { key, pct }]);
    }
  })(jsonObj);
if (leaves.length === 0) {
target.innerHTML = '<div class="no-data">Nincs elegendő közös adat a statisztika megjelenítéséhez (a válaszadási arány túl alacsony).</div>';
   return;}
  const depth        = Math.max(...leaves.map(p => p.length));
  const rowspanTodo  = Array(depth).fill(0);

  /* ---- táblázat ---- */
  const table = document.createElement('table');
  table.className = 'summary-matrix';
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  /* ---- csoporthatárok követése ---- */
  let prevRoot = null, prevRootRow = null;          // lvl0
  let prevSub  = null, prevSubRow  = null;          // lvl1

  leaves.forEach((path, rowIdx) => {
    while (path.length < depth) path.push({ key: '', pct: null });

    const rootKey = path[0].key;                   // lvl0 kulcs
    const subKey  = path[1]?.key || null;          // lvl1 kulcs (lehet '' / null)

    const tr = document.createElement('tr');
    tr.classList.add('group', 'subgroup');         // mindkét szinthez tartozik

    /* ---- lvl0 váltás ---- */
    if (rootKey !== prevRoot) {
      if (prevRootRow) prevRootRow.classList.add('group-end');
      tr.classList.add('group-start');
    }
    prevRoot = rootKey;
    prevRootRow = tr;

    /* ---- lvl1 váltás ---- */
    if (subKey && subKey !== prevSub) {
      if (prevSubRow) prevSubRow.classList.add('subgroup-end');
      tr.classList.add('subgroup-start');
    }
    prevSub = subKey;
    prevSubRow = tr;

    /* ---- cellák ---- */
    path.forEach(({ key, pct }, lvl) => {
      if (rowspanTodo[lvl]-- > 0) return;

      /* rowspan mérete */
      let span = 0;
      for (let i = rowIdx; i < leaves.length; i++) {
        if (leaves[i][lvl].key === key) span++;
        else break;
      }
      rowspanTodo[lvl] = span - 1;

      /* cella */
      const td = document.createElement('td');
      td.rowSpan = span;
      td.classList.add(levelClasses[lvl]);
td.textContent = key;                        // címke

if (pct != null) {
  const span = document.createElement('span');
  span.className = 'pct';                    // <- majd CSS-ben formázod
  span.textContent = ` ${pct}%`;
  td.appendChild(span);
}

      /* forgatás lvl0–lvl1 */
      if (lvl <= 1) {
        td.style.writingMode = 'vertical-rl';
        td.style.transform   = 'rotate(180deg)';
        td.style.textAlign   = 'right';
      }
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  /* záró jelölők az utolsó blokkoknál */
  if (prevRootRow) prevRootRow.classList.add('group-end');
  if (prevSubRow)  prevSubRow.classList.add('subgroup-end');

  target.appendChild(table);
}
const style = document.createElement('style');
style.textContent = `
  .summary-matrix { border-collapse: collapse; width: 100%; }
  .summary-matrix td { border: 1px solid #ccc; }
`;
document.head.appendChild(style);

//Diagramm generátor
function letrehozSzummDiagram(jsonObj, kategoriakChartSzinek) {


  const labels = [];
  const values = [];
  const szinek = [];
  

  for (const [nev, tartalom] of Object.entries(jsonObj)) {
    if (tartalom && typeof tartalom === 'object' && ('%' in tartalom)) {
      labels.push(nev);
      values.push(tartalom['%']);
const key = nev.trim();
szinek.push(kategoriakChartSzinek[key] ?? 'rgba(160,160,160,0.6)');    }
  }


const ctx = document.getElementById('szummChart')?.getContext('2d');
const mount = document.getElementById('magyarazat');
// ... chartok létrehozása ...
const statsMap = computePerCategoryStatsFromKijelolt(kijelolt);
renderInlineBarLegend({ mount, labels, values, colors: szinek, statsMap });
const count = Array.isArray(kijelolt) ? kijelolt.length : null;
renderExtremeBox({ mount, labels, values, colors: szinek, count });

//oszlop
function renderInlineBarLegend({ mount, labels, values, colors, statsMap }) {
  // Töröld az összes régi legendát
  let leg = mount.querySelector('#barLegend');
  if (leg) leg.remove();
  leg = document.createElement('div');
  leg.id = 'barLegend';
  leg.className = 'chart-legend inline';
  leg.style.display = 'flex';
  leg.style.flexWrap = 'wrap';
  leg.style.gap = '10px';
  leg.style.alignItems = 'center';

  const nums = values.filter(v => Number.isFinite(v));
  const minVal = nums.length ? Math.min(...nums) : null;
  const maxVal = nums.length ? Math.max(...nums) : null;

  const parts = labels.map((lab, i) => {
    const v = values[i];
    const pct = Number.isFinite(v) ? `${Math.round(v)}%` : '—';
    const sw = `<span class="swatch" style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;background:${colors[i]}"></span>`;
    const isExtreme = (v === minVal) || (v === maxVal);

    const st = statsMap?.[lab]; // lab == főkategória kulcs
    const statsHtml = st
      ? `<span class="mini-stats" style="opacity:.8;font-size:12px;margin-left:8px;">
           • Medián ${st.median}% • Szórás ${st.szoras} pont
         </span>`
      : '';

    const body = `${sw}<span>${lab} ${pct}</span>${statsHtml}`;
    return isExtreme
      ? `<strong class="legend-item" style="display:inline-flex;align-items:center;">${body}</strong>`
      : `<span class="legend-item" style="display:inline-flex;align-items:center;">${body}</span>`;
  });

  leg.innerHTML = parts.join('');
  mount.appendChild(leg);
}

//legjobb-legroszabb
function renderExtremeBox({ mount, labels, values, colors, count = null }) {
  // Mindig töröld, ha már van ilyen!
  let box = mount.querySelector('#extremeBox');
  if (box) box.remove();
  box = document.createElement('div');
  box.id = 'extremeBox';
  box.className = 'extreme-box';
  const min = Math.min(...values), max = Math.max(...values);
  const build = (type,val) => {
    const i = values.indexOf(val);
    return `<div class="${type}">
              <span class="swatch" style="background:${colors[i]}"></span>
              <strong>${type === 'best' ? 'Legjobban teljesített terület neve' : 'Fejlesztésre szoruló terület neve'}:</strong>
              ${labels[i]} ${Math.round(val)}%
            </div>`;
  };
  let html = build('best',max) + build('worst',min);

  // Bevonás száma (X fő)
  if (typeof count === 'number' && count > 0) {
    html += `<div class="involved-count" style="margin-top:7px; font-size:90%; opacity:.8; text-align:center;">
      <span style="font-weight:600;">A statisztikai adatok  ${count} fő bevonásával készültek.</span>
    </div>`;
  }
  box.innerHTML = html;
  mount.appendChild(box); // Mindig a végére kerül!
}

  if (ctx) {
    if (!szummChartInstance) {
  const dispLabels = labels.map(()=>'');      // üres feliratok a tengelyhez
szummChartInstance = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: dispLabels,
    datasets: [{
      label: 'Főkategóriák átlaga (%)',
      data: values,
      backgroundColor: szinek,
      borderColor: szinek.map(s => s.replace('0.5','1')),
      borderWidth: 1
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false, // <<-- EZT A SORT ADD HOZZÁ!
    layout: { padding: 0 },   // <<-- EZT A SORT ADD HOZZÁ!
    animation: { duration: 800 },
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { display: false }, grid: { display: false } },
      y: { beginAtZero: true, max: 100, ticks: { stepSize: 20 } }
    }
  }
});

// ── saját legenda ──
const leg = document.getElementById('barLegend') ?? (() => {
  const d = document.createElement('div');
  d.id = 'barLegend';
  d.className = 'chart-legend';
  ctx.canvas.parentNode.appendChild(d);
  return d;
})();
leg.innerHTML = '';
labels.forEach((lab, i) => {
  const badge = document.createElement('div');
  badge.className = 'legend-badge';
  badge.innerHTML = `<span class="swatch" style="background:${szinek[i]}"></span>${lab}`;
  leg.appendChild(badge);
});
    } else {
      szummChartInstance.data.labels = labels;
      szummChartInstance.data.datasets[0].data = values;
      szummChartInstance.data.datasets[0].backgroundColor = szinek;
      szummChartInstance.data.datasets[0].borderColor = szinek.map(s => s.replace('0.5', '1'));
      szummChartInstance.update();
    }
  }

  const polarCtx = document.getElementById('barPolar')?.getContext('2d');
  if (polarCtx) {
    // Ha a canvas újragenerálódott, a régi instance-ot dobd el
    if (szummPolarInstance && szummPolarInstance.ctx?.canvas !== polarCtx.canvas) {
      szummPolarInstance.destroy();
    }

    if (!szummPolarInstance) {
      szummPolarInstance = new Chart(polarCtx, {
        type: 'polarArea',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: szinek,
            borderColor: '#fff',
            borderWidth: 1
          }]
        },
       options: {
  responsive: true,
  maintainAspectRatio: false, // ha fix magasságot adsz a canvasnak
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed}%` }
    }
  },
  scales: {
    r: {
      beginAtZero: true,
      max: 100,
      ticks: {
        display: true,
        stepSize: 20,
        color: '#666',
        font: { size: 11 },
        callback: (v) => `${v}%`
      },
      grid: { color: 'rgba(0,0,0,0.12)' },
      angleLines: { color: 'rgba(0,0,0,0.12)' }
    }
  },
  layout: { padding: 8 }
}
      });
    } else {
      szummPolarInstance.data.labels = labels;
      szummPolarInstance.data.datasets[0].data = values;
      szummPolarInstance.data.datasets[0].backgroundColor = szinek;
      szummPolarInstance.update();
    }
  }

    // --- Radar diagram ---
  const radarCtx = document.getElementById('szummRadarChart')?.getContext('2d');
  if (radarCtx) {
    if (!szummRadarInstance) {
      
      szummRadarInstance = new Chart(radarCtx, {
        type: 'radar',
        data: {
          labels,
          datasets: [{
            label: 'Főkategóriák átlaga (%)',
            data: values,
            backgroundColor: 'rgba(76,154,221,0.2)',
            borderColor: 'rgba(76,154,221,0.9)',
            pointBackgroundColor: 'rgba(76,154,221,1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(76,154,221,1)',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
            maintainAspectRatio: true,  // →  a CSS diktálja a méretet

          scales: {
            r: {
              beginAtZero: true,
              max: 100,
              ticks: { stepSize: 20 },
pointLabels: {
      // Times + félkövér + nagy méret
      font: {
        size: 10,
        family: '"Times New Roman", Times, serif',
        style: 'normal',
        weight: 'bold' // vagy '700'
      },
      padding: 8
      // Chart.js 3.7+-tól: a címkék középre igazítása a sugár mentén
    
    }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: { enabled: true }
          }
        }
      });
    } else {
      szummRadarInstance.data.labels = labels;
      szummRadarInstance.data.datasets[0].data = values;
      szummRadarInstance.update();
    }
  } else {
    console.warn('Hiányzik a szummRadarChart canvas.');
  }
}

//Összátlag frissítése mindenhol
async function frissitAtlag() {
  if (kijelolt.length === 0) {
    atlagolt.length = 0;            
    return;
  }
  // átlag kiszámítása a korábban megírt függvénnyel
  const avg = averageEvaluations(kijelolt.map(o => o.szazalek));
  atlagolt[0] = avg;
  renderSummaryTree(atlagolt[0]);
   const { chartMap } = await loadColorMaps(modulId);
  letrehozSzummDiagram(avg, chartMap);
    frissitsRadar(kijelolt);   // <-- ÚJ sor
      updateMultiSeriesPie(kijelolt, chartMap);   
  
}
export function monitorozCheckek() {
  
  const container = document.querySelector('.inner-div'); // vagy ahol a pipák vannak

  if (!container) return;

container.addEventListener('change', async (e) => {
  if (!e.target.matches('input[type="checkbox"].cheking')) return;

const osszes = [...container.querySelectorAll('input[type="checkbox"].cheking')];
  const aktivak = osszes.filter(cb => cb.checked);

if (aktivak.length === 0) return;   // vagy teljesen szedd ki


  // 1) Töltsd be és push-old be a kijelolt tömbbe
  kijelolt.length = 0;
    const pdf = document.querySelector("#export-pdf");
  pdf.style.display="flex";
  for (const cb of aktivak) {
    const idk = Number(cb.dataset.id);
    try {
      const r  = await fetch(`/api/get-kitoltes-szazalek?kitoltes_id=${idk}`);
      const { szazalek } = await r.json();
      const parsed = typeof szazalek === 'string' ? JSON.parse(szazalek) : szazalek;

      // név kinyerése...
const card = cb.closest('.meglevok');

const nev = (card?.dataset.nev || 
             card?.querySelector('.vizsgalt-nev')?.textContent || 
             '')
            .trim();

const periodus = (card?.dataset.periodus || '').trim();
const raw   = typeof szazalek === 'string' ? JSON.parse(szazalek) : szazalek;
const clean = stripZeros(raw);

kijelolt.push({
  id: idk,
  nev,
  periodus,
  szazalek: clean          // már karcsúsítva megy tovább
});

    } catch (err) {
      console.error(`Hiba az értékelés betöltésénél (${idk}):`, err);
      cb.checked = false;
    }
  }

  // 2) Egyszer ürítsd és építsd fel a vizsgalt-tag-eket
  const vizsgaltDiv = document.getElementById('vizsgaltSzemelyek');
  vizsgaltDiv.innerHTML = '';
  kijelolt.forEach(obj => {
    const namePart = (obj.nev || '').split(/\s*-\s*/)[0].trim();
    const span = document.createElement('span');
    span.textContent = namePart;
    span.className = 'vizsgalt-tag';
    vizsgaltDiv.appendChild(span);
  });

  // 3) Elrejted / mutatod a felbukkanókat és címeket
  felbukkano2.style.display = felbukkano3.style.display = felbukkano4.style.display = 'none';
  document.querySelectorAll('.szummcim').forEach(e => e.style.display = 'flex');

  // 4) Átlag és diagram frissítése
  await frissitAtlag();
  await temaChecklistLetrehoz(kijelolt); // <<< ASZINKRON HÍVÁS
});

}

//Gomb
const ujertBtn = document.getElementById('ujstat');

//Függvény defniálás
function selectAllCheckboxes() {
  // mindent, ami cheking osztályú checkbox
  const boxes = Array.from(document.querySelectorAll('input.cheking[type="checkbox"]'));
  if (boxes.length === 0) {
    console.warn('Nincs egyetlen checkbox sem az oldalon.');
    return;
  }

  // pipáljuk mindet
  boxes.forEach(cb => cb.checked = true);

  // és csak egyszer indítsuk el a change-logikát:
  boxes[0].dispatchEvent(new Event('change', { bubbles: true }));
}

//kötés kattintásra
if (ujertBtn) {
  ujertBtn.addEventListener('click', e => {
    e.preventDefault();      // ha <a> elem, ne navigáljon sehová
    selectAllCheckboxes();
  });
}

function stripZeros(node) {
  if (!node || typeof node !== 'object') return node;
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (typeof v === 'number') {
      if (v === 0) delete node[k];              // levél 0? kuka
    } else {
      stripZeros(v);                            // merülj mélyebbre
      if (Object.keys(v).length === 0) delete node[k]; // üres ág? kuka
    }
  }
  return node;
}

const pie   = document.getElementById('szummRadarChart');
const radar = document.getElementById('pieWrap');
const btn   = document.getElementById('toggleBtn');

btn.addEventListener('click', () => {
  const pieVisible = pie.style.display !== 'none';
  pie.style.display   = pieVisible ? 'none' : 'block';
  radar.style.display = pieVisible ? 'block' : 'none';
  btn.textContent     = pieVisible ? 'Váltás kördiagramra' : 'Váltás radar-diagramra';
});

function _round1(v){ return Math.round(v*10)/10; }

function computePerCategoryStatsFromKijelolt(kijeloltTomb){
  const byCat = {};
  kijeloltTomb.forEach(obj => {
    const top = extractTopLevelPercents(obj.szazalek);
    for (const [cat, vRaw] of Object.entries(top)) {
      const v = Number(vRaw);
      if (!Number.isFinite(v)) continue;
      (byCat[cat] ||= []).push(v);
    }
  });

  const out = {};
  for (const [cat, arr] of Object.entries(byCat)) {
    if (!arr.length) continue;
    const n = arr.length;
    const sorted = [...arr].sort((a,b)=>a-b);
    const avg = arr.reduce((s,v)=>s+v,0) / n;
    const med = (n % 2) ? sorted[(n-1)/2]
                        : (sorted[n/2-1] + sorted[n/2]) / 2;
    const variance = arr.reduce((s,v)=> s + (v-avg)*(v-avg), 0) / n; // populációs szórás
    const std = Math.sqrt(variance);
    out[cat] = { atlag: _round1(avg), median: _round1(med), szoras: _round1(std) };
  }
  return out;
}
