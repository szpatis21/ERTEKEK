import { modulId, userId, fullname, animateMessage } from './dashMain.js';
import { readBarLegendItems } from './dashPDF.js';
import { showAlert } from '/both/alert.js';

// ÚJ FÜGGVÉNY: Markdown szöveg átalakítása pdfMake objektumokká
function markdownToPdfMake(text) {
    if (!text) return [];
    const lines = text.split('\n');
    const content = [];
    let currentList = null;

    const parseInlineFormatting = (str) => {
        const parts = str.split(/(\*\*.*?\*\*)/g);
        return parts.map(part => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return { text: part.slice(2, -2), bold: true };
            }
            return part;
        }).filter(p => p !== '');
    };

    for (let line of lines) {
        let trimmed = line.trim();
        
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            if (!currentList) {
                // ul (unordered list) létrehozása 15px bal oldali behúzással, kisebb alsó margóval
                currentList = { ul: [], margin: [15, 5, 0, 10] };
                content.push(currentList);
            }
            currentList.ul.push({ text: parseInlineFormatting(trimmed.substring(2)) });
        } else {
            if (currentList) currentList = null; // Lista lezárása

            if (trimmed.startsWith('# ')) {
                content.push({ text: trimmed.substring(2), style: 'h1' });
            } else if (trimmed.startsWith('### ')) {
                content.push({ text: trimmed.substring(4), style: 'h3' });
            } else if (trimmed === '') {
                // Üres sor - szándékosan nem adunk hozzá újabb margót vagy üres objektumot, 
                // mert a normál szöveg bottom margója elég lesz.
            } else {
                // Csökkentett alsó margó: 10 helyett 6
                content.push({ text: parseInlineFormatting(trimmed), margin: [0, 0, 0, 6] });
            }
        }
    }
    return content;
}
// =========================================================
// 1. DINAMIKUS MODÁL LÉTREHOZÁSA ÉS KEZELÉSE
// =========================================================
function ensureAiModalExists() {
    if (document.getElementById('ai-modal-overlay')) return;

    const html = `
    <div id="ai-modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); backdrop-filter: blur(5px); z-index:9999; justify-content:center; align-items:center;">
        <div id="ai-modal-container" style="background:#fff; width:95%; max-width:850px; height:85vh; border-radius:12px; display:flex; flex-direction:column; box-shadow: 0 10px 30px rgba(0,0,0,0.4); overflow:hidden; transform: scale(0.9); opacity: 0; transition: all 0.3s ease;">
            
            <div class="ai">
                <div style="display: flex; width: 100%;">
                <button id="ai-btn-refresh" class="modulebutt" style="display:none; color:#1976d2;">Frissítés</button>

<div id="ai-modal-notification" style="display:none; 
    background: #ff8451;
    color: #fff;
    padding: 10px;
    border-radius: 6px;
    margin-bottom: 15px;
    font-weight: bold;
    text-align: center;
    transition: opacity 0.5s;
    opacity: 0;
    top: 1%;
    z-index: 50;
    position: absolute; transition: opacity 0.5s;">
    Erről az értékelésről már készült elemzés. Ha változtak az adatok, a "Frissítés" gombbal aktualizálhatja.
</div>
                    <button id="ai-btn-pdf" class="modulebutt">PDF</button>
                    <button id="ai-btn-print" class="modulebutt"> Nyomtatás</button>
                    <button id="ai-btn-copy" class="modulebutt">Másolás</button>
                </div>
                <button id="ai-btn-close" style="background:transparent; border:none;color: #ff6500;font-weight: bold; font-size:2rem; cursor:pointer; line-height:1;">&times;</button>
            </div>

            <div style="padding:30px; overflow-y:auto; flex-grow:1; position:relative; background:#fafafa;">
                
                <div id="ai-modal-loading" style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%; min-height: 300px;">
                    <div style="border: 5px solid #e0e0e0; border-top: 5px solid #ff9800; border-radius: 50%; width: 60px; height: 60px; animation: ai-spin 1s linear infinite;"></div>
                    <p style="margin-top:25px; font-weight:bold; font-size:1.3rem; color:#ff9800;">Mindjárt készen vagyunk...</p>
                </div>

                <div id="ai-modal-content" style="display:none;">
                    <h2 id="ai-modal-title" style="margin-top:0; color:#333; border-bottom: 2px solid #ff9800; padding-bottom: 10px;">Értékelés neve</h2>
                    <div id="ai-modal-body" style="line-height:1.7; color:#333; font-size: 1.1rem; white-space: pre-wrap;"></div>
                </div>

            </div>

            <div style="background:#fff3e0; padding:12px 20px; text-align:center; border-top:1px solid #ffcc80;">
                <i style="font-size:0.9rem; color:#d84315;">* A mesterséges intelligencia által generált szöveg nem minősül szakvéleménynek, csak egy részletes útmutatásnak.</i>
            </div>
        </div>
    </div>
    <style>
        @keyframes ai-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .ai-modal-show #ai-modal-container { transform: scale(1) !important; opacity: 1 !important; }
    </style>
    `;

    document.body.insertAdjacentHTML('beforeend', html);

    // ESEMÉNYEK KEZELÉSE
    document.getElementById('ai-btn-close').onclick = closeAiModal;
    
    // MÁSOLÁS GOMB
    document.getElementById('ai-btn-copy').onclick = () => {
        const title = document.getElementById('ai-modal-title').innerText;
        const text = document.getElementById('ai-modal-body').innerText;
        navigator.clipboard.writeText(`${title}\n\n${text}`).then(() => showAlert('Szöveg sikeresen másolva a vágólapra!'));
    };

    // NYOMTATÁS GOMB
    document.getElementById('ai-btn-print').onclick = () => {
        const title = document.getElementById('ai-modal-title').innerText;
        const content = document.getElementById('ai-modal-body').innerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #000; padding: 20px; max-width: 800px; margin: auto; }
                    h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
                    ul { margin-top: 10px; margin-bottom: 15px; }
                    li { margin-bottom: 8px; }
                    p { margin-bottom: 15px; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                ${content}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 300);
    };

// PDF GOMB
document.getElementById('ai-btn-pdf').onclick = async () => {
    if (typeof window.pdfMake === 'undefined') { await import('/both/fonts/pdfmake.min.js'); }
    if (!window.pdfMake?.vfs) { await import('/both/fonts/vfs_fonts.js'); }

    if (typeof window.pdfMake !== 'undefined') {
        const title = document.getElementById('ai-modal-title').innerText; //[cite: 9]
        
        // Fájlnév megtisztítása a fájlrendszer számára tiltott karakterektől
        const safeFileName = `${title.replace(/[/\\?%*:|"<>]/g, '-')}.pdf`;
        
        // 1. Nyers Markdown szöveg kinyerése a dataset-ből (a formázott HTML helyett)
        const rawText = document.getElementById('ai-modal-body').dataset.rawText || document.getElementById('ai-modal-body').innerText; //[cite: 9]
        
        // 2. A szöveg átalakítása pdfMake objektumokká a saját függvényeddel
        const parsedContent = markdownToPdfMake(rawText); //[cite: 9]

        if (!window.pdfMake.fonts) window.pdfMake.fonts = {};
        
        const timesInVfs = !!pdfMake.vfs['times.ttf'] && 
                           !!pdfMake.vfs['timesbd.ttf'] && 
                           !!pdfMake.vfs['timesi.ttf'] && 
                           !!pdfMake.vfs['timesbi.ttf']; //[cite: 9]

        window.pdfMake.fonts.Times = timesInVfs ? {
            normal: 'times.ttf',
            bold: 'timesbd.ttf',
            italics: 'timesi.ttf',
            bolditalics: 'timesbi.ttf'
        } : {
            normal: Object.keys(pdfMake.vfs)[0],
            bold: Object.keys(pdfMake.vfs)[0],
            italics: Object.keys(pdfMake.vfs)[0],
            bolditalics: Object.keys(pdfMake.vfs)[0]
        }; //[cite: 9]

        const docDefinition = {
            // FEJLÉC
            header: function(currentPage, pageCount, pageSize) {
                return {
                    text: title, 
                    margin: [40, 20, 40, 0],
                    alignment: 'right',
                    color: '#888888',
                    fontSize: 10
                };
            }, //[cite: 9]
            // LÁBLÉC OLDALSZÁMMAL
            footer: function(currentPage, pageCount) {
                return {
                    text: `${currentPage} / ${pageCount}`,
                    alignment: 'center',
                    margin: [0, 10, 0, 0],
                    fontSize: 10
                };
            }, //[cite: 9]
            // OLDALMARGÓK (Bal, Felső, Jobb, Alsó) - kell a hely a fejlécnek/láblécnek
            pageMargins: [40, 60, 40, 60], 
            defaultStyle: {
                font: 'Times', 
                fontSize: 12,
                lineHeight: 1.2 
            }, //[cite: 9]
            fonts: {
                Times: window.pdfMake.fonts.Times
            }, //[cite: 9]
            content: [
                { text: title, style: 'header' },
                // 3. A parsolt tömb elemeinek kiterítése (spread) a content tömbbe
                ...parsedContent 
            ], //[cite: 9]
            styles: {
                header: { fontSize: 18, bold: true, margin: [0, 0, 0, 15] },
                h1: { fontSize: 16, bold: true, margin: [0, 10, 0, 5] },
                h3: { fontSize: 14, bold: true, margin: [0, 8, 0, 5] }
            } //[cite: 9]
        };
        
        // CSERÉLT SOR: Itt kapja meg a letöltés a dinamikus nevet
        window.pdfMake.createPdf(docDefinition).download(safeFileName);
        
    } else {
        document.getElementById('ai-btn-print').click(); //[cite: 9]
        showAlert('Mentéshez válaszd a "Mentés PDF-ként" opciót!'); //[cite: 9]
    }
};
}

function openAiModal(titleText) {
    ensureAiModalExists();
    const overlay = document.getElementById('ai-modal-overlay');
    const title = document.getElementById('ai-modal-title');
    const body = document.getElementById('ai-modal-body');
    const loading = document.getElementById('ai-modal-loading');
    const content = document.getElementById('ai-modal-content');

    title.innerText = titleText || 'AI Értékelés';
    body.innerHTML = ''; 
    body.style.whiteSpace = 'pre-wrap'; 
    
    loading.style.display = 'flex';
    content.style.display = 'none';
    
    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('ai-modal-show'), 10);
}

function closeAiModal() {
    const overlay = document.getElementById('ai-modal-overlay');
    if (overlay) {
        overlay.classList.remove('ai-modal-show');
        setTimeout(() => overlay.style.display = 'none', 300);
    }
}

// FORMATÁLÓ FÜGGVÉNY: Csillagokból és sorokból szép HTML struktúrát és listát csinál
function formatTextToHtmlList(rawText) {
    const lines = rawText.split('\n');
    let html = '';
    let inList = false;

    for (let line of lines) {
        let trimmed = line.trim();
        
        // Félkövér szövegek felismerése (**szöveg** -> <strong>szöveg</strong>)
        trimmed = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            if (!inList) { 
                html += '<ul style="padding-left:25px; margin-top:15px; margin-bottom:15px; border-left: 3px solid #ff9800;">'; 
                inList = true; 
            }
            html += `<li style="margin-bottom:8px; padding-left: 5px;">${trimmed.substring(2)}</li>`;
        } else if (trimmed.startsWith('# ')) {
            if (inList) { html += '</ul>'; inList = false; }
            // Főcím formázása
            html += `<h1 style="color:#333; border-bottom: 2px solid #ff9800; padding-bottom: 5px; margin-top: 20px; font-size: 1.5em;">${trimmed.substring(2)}</h1>`;
        } else if (trimmed.startsWith('### ')) {
            if (inList) { html += '</ul>'; inList = false; }
            // Alcím formázása
            html += `<h3 style="color:#ff6500; margin-top: 15px; font-size: 1.2em;">${trimmed.substring(4)}</h3>`;
        } else {
            if (inList) { html += '</ul>'; inList = false; }
            if (trimmed === '') {
                html += '<br>';
            } else {
                html += `<p style="margin-top:0; margin-bottom:10px;">${trimmed}</p>`;
            }
        }
    }
    if (inList) html += '</ul>';
    return html;
}

// =========================================================
// 2. ADAT-ELŐKÉSZÍTŐ FÜGGVÉNYEK
// =========================================================

function parseSummaryTableToObject() {
  const table = document.querySelector('#szumm-fa table');
  if (!table) return {};

  const data = {};
  let currentFotema = '', currentFotemaKey = '';
  let currentAlkat = '', currentAlkatKey = '';

  for (const row of table.rows) {
    const cells = Array.from(row.cells).map(cell => cell.innerText.trim());
    let cellIndex = 0;

    if (row.cells[cellIndex] && !row.cells[cellIndex].hasAttribute('data-placeholder')) { 
      const fotemaText = cells[cellIndex] || '';
      if (fotemaText) {
        const match = fotemaText.match(/^(.*?)\s*(\d{1,3})%/);
        currentFotemaKey = match ? match[1].trim().toUpperCase() : fotemaText.toUpperCase(); 
        currentFotema = match ? match[1].trim() : fotemaText; 
        
        data[currentFotemaKey] = {
          nev: currentFotema,
          '%': match ? parseInt(match[2], 10) : null,
          alkategoriak: {}
        };
        cellIndex++; 
      }
    }
    const alkatText = cells[cellIndex] || '';
    if (alkatText && currentFotemaKey) {
      const match = alkatText.match(/^(.*?)\s*(\d{1,3})%/);
      currentAlkatKey = match ? match[1].trim() : alkatText;
      
      data[currentFotemaKey].alkategoriak[currentAlkatKey] = {
        nev: currentAlkatKey,
        '%': match ? parseInt(match[2], 10) : null,
        altTemak: {}
      };
      cellIndex++; 
    }
    const altemaText = cells[cellIndex] || '';
    if (altemaText && currentFotemaKey && currentAlkatKey) {
      const match = altemaText.match(/^(.*?)\s*(\d{1,3})%/);
      if (match) {
        const altemaName = match[1].trim();
        const altemaPct = parseInt(match[2], 10);
        if (data[currentFotemaKey].alkategoriak[currentAlkatKey]) {
          data[currentFotemaKey].alkategoriak[currentAlkatKey].altTemak[altemaName] = altemaPct;
        }
      }
    }
  }
  return data;
}

function buildAiPromptText() {
  let prompt = "";
  const reszletesAdatok = parseSummaryTableToObject();
  const szemelyekSzama = document.querySelectorAll('#vizsgaltSzemelyek .vizsgalt-tag').length || 8; 
  prompt += `Elemzés ${szemelyekSzama} fő bevonásával készült.\n\n`;

  const barLegendItems = readBarLegendItems(); 
  const parsed = barLegendItems.map(it => {
      const m = it.label.match(/^(.*?)\s+(\d{1,3})\s*%/);
      const name = (m ? m[1] : it.label).trim();
      const pct = m ? +m[2] : null;
      return { name, pct };
  }).filter(x => x.pct !== null);

  if (parsed.length === 0) return "Hiba: A fő kategóriák adatai hiányoznak az elemzéshez.";

  const nums = parsed.map(p => p.pct).sort((a, b) => a - b);
  const n = nums.length;
  const avg = Math.round(nums.reduce((s, v) => s + v, 0) / n);
  const med = n % 2 ? nums[(n - 1) / 2] : Math.round((nums[n / 2 - 1] + nums[n / 2]) / 2);
  
  prompt += `ÖSSZESÍTETT EREDMÉNYEK (${n} fő kategória):\nÁtlag: ${avg}%, Medián: ${med}%\n\n`;
  prompt += "FŐ KATEGÓRIÁK ÁTLAGAI:\n";
  const sortedDesc = [...parsed].sort((a, b) => b.pct - a.pct);
  sortedDesc.forEach(kat => { prompt += `- ${kat.name}: ${kat.pct}%\n`; });

  const top2 = sortedDesc.slice(0, 2);
  const low2 = [...sortedDesc].reverse().slice(0, 2);
  const kiemeltek = [...top2, ...low2];

  prompt += "\n--- KIEMELT KATEGÓRIÁK RÉSZLETES LEBONTÁSA ---\n";
  
  kiemeltek.forEach(kat => {
    const detailKey = kat.name.toUpperCase();
    const detail = reszletesAdatok[detailKey];
    if (detail) {
      prompt += `\nKategória: "${detail.nev}" (Összesített: ${detail['%']}%)\n`;
      for (const [alkatKey, alkatData] of Object.entries(detail.alkategoriak)) {
        prompt += `  - Alkategória: ${alkatData.nev} (${alkatData['%']}%)\n`;
        for (const [altemaNev, altemaPct] of Object.entries(alkatData.altTemak)) {
          prompt += `    - ${altemaNev}: ${altemaPct}%\n`;
        }
      }
    } else {
       prompt += `\nKategória: "${kat.name}" (${kat.pct}%) - Részletes lebontás nem található.\n`;
    }
  });
  return prompt;
}

function sanitizeForAi(rawJson) {
    if (!rawJson) return {};
    const clean = {};
    for (const [tema, adat] of Object.entries(rawJson)) {
        if (adat['%'] != null) {
            clean[tema] = { pct: adat['%'], al: {} };
            for (const [alKat, alAdat] of Object.entries(adat.alkategoriak || {})) {
                const szurtAltémák = Object.entries(alAdat.altTemak || {})
                    .filter(([_, p]) => p < 70 || p === 100)
                    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
                clean[tema].al[alKat] = { pct: alAdat['%'], reszletek: szurtAltémák };
            }
        }
    }
    return clean;
}

// =========================================================
// 3. API HÍVÁSOK ÉS STREAMELÉS (JAVÍTOTT, GYORS VERZIÓ)
// =========================================================

export async function triggerAiAnalysis() {
  const elsoKartya = document.querySelector('.meglevok'); // <-- EZ LEMARADT!
  if (elsoKartya) {
      const remainingOsszMax = parseInt(elsoKartya.dataset.aiOsszMax || 0);
      if (remainingOsszMax <= 0) {
          showAlert('Elfogytak az AI generálási lehetőségei (Globális limit).');
          return false; // Megszakítjuk a futást, nem indul a stream
      }
  }
  try {
    const smartText = buildAiPromptText(); 
    if (smartText.length < 50) throw new Error('A sűrített adatok generálása sikertelen.');

    // Kinyitjuk a modált a töltőképernyővel
// Kinyitjuk a modált a töltőképernyővel a csoportos elemzéshez
    ensureAiModalExists();
    document.getElementById('ai-modal-main-title').textContent = 'Csoportos Szakmai Értékelés';
    document.getElementById('ai-type-tabs').innerHTML = ''; // Csoportosnál nem kellenek az egyéni tabok
    document.getElementById('ai-modal-overlay').style.display = 'flex';
    document.getElementById('ai-modal-loading').style.display = 'flex';
    document.getElementById('ai-modal-content').style.display = 'none';
    window.currentAiCard = null;
    // --- ÚJ RÉSZ: Golyóálló, API-alapú egyéni adatgyűjtés ---
    let egyeniAdatokSzoveg = "";
    const checkedBoxes = document.querySelectorAll('input[type="checkbox"].cheking:checked');

    if (checkedBoxes.length > 0) {
        // Promise.all-t használunk, hogy a 10-20 gyerek adatát egyszerre, párhuzamosan (villámgyorsan) kérje le, ne egyesével várjon rájuk.
        const adatIgeretek = Array.from(checkedBoxes).map(async (checkbox) => {
            const kitoltesDiv = checkbox.closest('.meglevok');
            const nev = kitoltesDiv ? (kitoltesDiv.dataset.nev || 'Ismeretlen') : 'Ismeretlen';
            const kitoltesId = checkbox.dataset.id;

            try {
                // Használjuk a már létező, jól bevált végpontodat a dashCRUD-ból
                const res = await fetch(`/api/get-kitoltes-szazalek?kitoltes_id=${kitoltesId}`);
                const data = await res.json();

                if (data.szazalek) {
                    const raw = typeof data.szazalek === 'string' ? JSON.parse(data.szazalek) : data.szazalek;
                    let legjobbT = "";
                    let leggyengebbT = "";
                    let maxPct = -1;
                    let minPct = 101;

                    // Végigmegyünk a fő témakörökön
                    for (const [tema, obj] of Object.entries(raw || {})) {
                        if (obj && typeof obj['%'] === 'number') {
                            const pct = obj['%'];
                            if (pct > maxPct) { maxPct = pct; legjobbT = tema; }
                            if (pct < minPct) { minPct = pct; leggyengebbT = tema; }
                        }
                    }

                    if (legjobbT && leggyengebbT) {
                        return `- ${nev} (Erősség: ${legjobbT} [${maxPct}%], Fejlesztendő: ${leggyengebbT} [${minPct}%])`;
                    }
                }
            } catch (err) {
                console.warn(`Nem sikerült betölteni a(z) ${nev} adatait:`, err);
            }
            return null; // Ha valami hiba volt, null-t ad vissza
        });

        // Megvárjuk, amíg az összes adat megérkezik, majd összerakjuk egy szöveggé
        const eredmenyek = await Promise.all(adatIgeretek);
        egyeniAdatokSzoveg = eredmenyek.filter(Boolean).join('\n'); // A filter(Boolean) kiszedi a null értékeket
        
    } else {
        egyeniAdatokSzoveg = "Nem állnak rendelkezésre egyéni adatok.";
    }
    // --- ÚJ RÉSZ VÉGE ---

    // Módosított fetch hívás a backend felé (hozzáfűzve az egyeniAdatok mezőt)
    const response = await fetch('/api/generate/jellemzes-from-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
          raw: smartText, 
          egyeniAdatok: egyeniAdatokSzoveg, 
          modulId: modulId 
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Ismeretlen szerverhiba' }));
      throw new Error(`Szerverhiba (${response.status}): ${errorData.message}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let buffer = '';
    let fullTextBuffer = ''; 
    let printBuffer = '';    
    let isFirstChunk = true;
    const bodyDiv = document.getElementById('ai-modal-body');

   while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        bodyDiv.style.whiteSpace = 'normal';
        bodyDiv.innerHTML = formatTextToHtmlList(fullTextBuffer);
        bodyDiv.dataset.rawText = fullTextBuffer; 
        break; 
      }

      buffer += decoder.decode(value, { stream: true }); 
      let lines = buffer.split('\n');
      buffer = lines.pop(); 

      for (const line of lines) {
        // --- ÚJ RÉSZ: Szerver üzenetének (Fallback váltás) figyelése ---
        if (line.trim() === ': MODEL_CHANGE') {
            const loadingText = document.querySelector('#ai-modal-loading p');
            if (loadingText) {
                loadingText.innerText = "Modellváltás, rögtön készen vagyunk...";
                loadingText.style.color = "#d32f2f"; // Opcionális: Pirosra vagy más színre váltás
            }
            continue; 
        }

        if (line.startsWith('data: ')) {
          // Ha adat érkezik, eltüntetjük a betöltőt
          if (isFirstChunk) {
            document.getElementById('ai-modal-loading').style.display = 'none';
            document.getElementById('ai-modal-content').style.display = 'block';
            isFirstChunk = false;
          }

          const dataChunk = line.substring(6).trim();
          
          if (dataChunk === '[DONE]') {
            bodyDiv.style.whiteSpace = 'normal';
            bodyDiv.innerHTML = formatTextToHtmlList(fullTextBuffer);
            fetch('/api/decrease-global-quota', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId })
            }).then(() => {
                // Végigmegyünk az összes kártyán, és levonunk egyet a memóriában lévő kvótából,
                // így a következő kattintásnál már a frissített limit lesz érvényben.
                document.querySelectorAll('.meglevok').forEach(kartya => {
                    let aktualis = parseInt(kartya.dataset.aiOsszMax || 0);
                    if (aktualis > 0) kartya.dataset.aiOsszMax = aktualis - 1;
                });
            }).catch(err => console.error('Kvóta levonási hiba:', err));
            return true; 
          }
          
          try {
            const payload = JSON.parse(dataChunk); 
            const textDelta = payload.choices?.[0]?.delta?.content || '';
            if (textDelta) {
                fullTextBuffer += textDelta;
                printBuffer += textDelta;
                
                let lastSpace = printBuffer.lastIndexOf(' ');
                if (lastSpace > -1) {
                    bodyDiv.appendChild(document.createTextNode(printBuffer.substring(0, lastSpace + 1)));
                    printBuffer = printBuffer.substring(lastSpace + 1);
                }
            }
          } catch (e) {}
        } 
      } 
    }
    return true;

  } catch (err) {
    console.error('AI elemzés hiba (stream):', err);
    showAlert(`Hiba történt az AI elemzés során: ${err.message}`);
    closeAiModal();
    return false;
  }
}

// AI CSOPORTOS JELLEMZÉS GOMB KEZELŐJE
const aiBtn = document.getElementById('ai-generate-btn');
if (aiBtn && !aiBtn.dataset.listenerAdded) {
  aiBtn.addEventListener('click', async () => {
    if (window.__pdfBusy) return;
    window.__pdfBusy = true;
    
    // CSERE ITT:
    const oldText = aiBtn.innerHTML; 
    aiBtn.disabled = true;
    aiBtn.innerHTML = 'Indítás...'; 

    try {
      await triggerAiAnalysis();
    } catch (err) {
      console.error('AI elemzés hiba:', err);
    } finally {
      aiBtn.disabled = false;
      // CSERE ITT IS:
      aiBtn.innerHTML = oldText; 
      window.__pdfBusy = false;
    }
  });
  aiBtn.dataset.listenerAdded = 'true';
}

// EGYÉNI JELLEMZÉS
export async function triggerIndividualAiAnalysis(callerBtn = null, forceNew = false) {
  if (!modulId) {
      showAlert('Hiba: Nem azonosítható a szakmai modul (modulId hiányzik). Kérjük, frissítse az oldalt.');
      return;
  }
  
  if (!window.ertekelesJSON || Object.keys(window.ertekelesJSON).length < 3) {
      showAlert('Nincs elegendő adat az elemzéshez. Legalább 3 témakört értékelnie kell.');
      return;
  }

  const tisztaAdat = sanitizeForAi(window.ertekelesJSON);
  const komplexAdatcsomag = {
      statisztika: tisztaAdat,
      nyersValaszok: (window.kerdesValaszok || []).map(v => ({ k: v.kerdes_szoveg, p: v.valasz_ertek })),
      megjegyzesek: window.szovegesValaszok
  };

  // --- BIZTONSÁGOS SOR (meglevok) MEGÁLLAPÍTÁSA ---
// --- BIZTONSÁGOS SOR (meglevok) MEGÁLLAPÍTÁSA ---
  let valodiMeglevok = null;
  if (callerBtn) {
      valodiMeglevok = callerBtn.closest('.meglevok');
      if (!valodiMeglevok) {
          const wrapper = callerBtn.closest('.modules');
          if (wrapper && wrapper._originalRow) {
              valodiMeglevok = wrapper._originalRow;
          }
      }
  }

  // ÚJ: KVÓTA ELLENŐRZÉS MIELŐTT BÁRMI TÖRTÉNNE
  if (valodiMeglevok) {
      const remainingKitMax = parseInt(valodiMeglevok.dataset.aiKitMax || 0);
      const remainingOsszMax = parseInt(valodiMeglevok.dataset.aiOsszMax || 0);

      if (remainingOsszMax <= 0) {
          showAlert('Elfogytak az AI generálási lehetőségei (Globális limit). Kérjük, vegye fel a kapcsolatot az adminisztrátorral.');
          return;
      }
      if (remainingKitMax <= 0 && forceNew) {
          // Csak akkor blokkoljuk a KitMax miatt, ha ÚJAT akar kérni (forceNew),
          // vagy még nincs mentett AI szövege. Ha van elmentett, azt attól még megnézheti.
          showAlert('Ehhez az értékeléshez már nem indíthat több új AI elemzést (Limit elérve).');
          return;
      }
  }

  // --- CÍM KINYERÉS ---
  let modalTitle = 'Egyéni Profil Értékelés';
  const kitNeveElem = document.querySelector('#kitneve');
  
  if (kitNeveElem && kitNeveElem.innerText) {
      modalTitle = `${kitNeveElem.innerText.trim()}`;
  } else if (valodiMeglevok) {
      const nev = valodiMeglevok.dataset.nev || '';
      const periodus = valodiMeglevok.dataset.periodus || '';
      const megnev = valodiMeglevok.dataset.megnev || '';
      modalTitle = `${nev} (${periodus} - ${megnev})`;
  }

  // --- ELMENTETT AI SZÖVEG KINYERÉSE ---
  let savedAiText = '';
  if (valodiMeglevok && valodiMeglevok.dataset.aiText && valodiMeglevok.dataset.aiText !== 'null') {
      savedAiText = valodiMeglevok.dataset.aiText;
  }
  
  openAiModal(modalTitle);
  const refreshBtn = document.getElementById('ai-btn-refresh');
  const notificationDiv = document.getElementById('ai-modal-notification');
  const bodyDiv = document.getElementById('ai-modal-body');
  
  // HA VAN ELMENTETT ADAT ÉS NEM KÉRTÜNK KIFEJEZETTEN ÚJAT
  if (savedAiText && !forceNew) {
      document.getElementById('ai-modal-loading').style.display = 'none';
      document.getElementById('ai-modal-content').style.display = 'block';
      
      bodyDiv.style.whiteSpace = 'normal';
      bodyDiv.innerHTML = formatTextToHtmlList(savedAiText);
      bodyDiv.dataset.rawText = savedAiText;

      refreshBtn.style.display = 'block';
      notificationDiv.style.display = 'block';
      notificationDiv.style.opacity = '1';

      setTimeout(() => {
          notificationDiv.style.opacity = '0';
          setTimeout(() => notificationDiv.style.display = 'none', 500);
      }, 5000);

  refreshBtn.onclick = () => {
          const remainingKitMax = parseInt(valodiMeglevok.dataset.aiKitMax || 0);
          if (remainingKitMax <= 0) {
               showAlert('Ehhez az értékeléshez már nem indíthat több frissítést (Limit elérve).');
               return;
          }
          triggerIndividualAiAnalysis(callerBtn, true); 
      };

      return; 
  }

  // HA ÚJAT KÉRTEK, VAGY NINCS ADAT
  if (valodiMeglevok) {
      const remainingKitMax = parseInt(valodiMeglevok.dataset.aiKitMax || 0);
      if (remainingKitMax <= 0 && !savedAiText) {
          showAlert('Ehhez az értékeléshez már nem indíthat AI elemzést (Limit elérve).');
          closeAiModal();
          return;
      }
  }
  refreshBtn.style.display = 'none';
  notificationDiv.style.display = 'none';

  if (callerBtn) callerBtn.style.pointerEvents = 'none';  

  try {
    const response = await fetch('/api/generate/jellemzes-from-json', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          jsonData: komplexAdatcsomag,
          modulId: modulId 
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Ismeretlen szerverhiba' }));
      throw new Error(errorData.message);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    let fullTextBuffer = ''; 
    let printBuffer = '';
    let isFirstChunk = true;

    while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
            bodyDiv.style.whiteSpace = 'normal';
            bodyDiv.innerHTML = formatTextToHtmlList(fullTextBuffer);
            bodyDiv.dataset.rawText = fullTextBuffer; 
            
            // --- MENTÉS AZ ADATBÁZISBA (1. LEHETŐSÉG: Stream vége) ---
            if (valodiMeglevok && fullTextBuffer.length > 50) {
                const kitoltesId = valodiMeglevok.dataset.kitoltesId;
          fetch('/api/save-ai-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kitoltesId: kitoltesId, aiText: fullTextBuffer, userId: userId })
})
.then(res => res.json())
.then(data => {
    if (data.success) {
        valodiMeglevok.dataset.aiText = fullTextBuffer;
        
        // 1. Kvóták csökkentése a kártya datasetjében
        let currentKitMax = parseInt(valodiMeglevok.dataset.aiKitMax || 10) - 1;
        let currentOsszMax = parseInt(valodiMeglevok.dataset.aiOsszMax || 100) - 1;
        
        if (currentKitMax < 0) currentKitMax = 0;
        if (currentOsszMax < 0) currentOsszMax = 0;
        
        valodiMeglevok.dataset.aiKitMax = currentKitMax;
        valodiMeglevok.dataset.aiOsszMax = currentOsszMax;

        // 2. Felugró értesítés megjelenítése a modálban
        const notificationDiv = document.getElementById('ai-modal-notification');
        if (notificationDiv) {
            notificationDiv.innerText = `Sikeres elemzés és mentés! Ehhez az értékeléshez még ${currentKitMax} alkalommal generálhat elemzést.`;
            notificationDiv.style.backgroundColor = '#ff6500;'; 
            notificationDiv.style.display = 'block';
            
            setTimeout(() => { notificationDiv.style.opacity = '1'; }, 10);

            // 5 másodperc múlva eltüntetjük, és visszaállítjuk az eredeti állapotot
            setTimeout(() => {
                notificationDiv.style.opacity = '0';
                setTimeout(() => { 
                    notificationDiv.style.display = 'none'; 
                    // Visszaállítjuk az eredeti narancssárga figyelmeztetést a következő megnyitásra
                    notificationDiv.innerText = 'Erről az értékelésről már készült elemzés. Ha változtak az adatok, a "Frissítés" gombbal aktualizálhatja.';
                    notificationDiv.style.backgroundColor = '#ff6500';
                }, 500);
            }, 5000);
        }
    }
})
.catch(err => console.error('Hiba a mentés és kvótalevonás során:', err));
            }
            break;
        }

        if (isFirstChunk) {
            document.getElementById('ai-modal-loading').style.display = 'none';
            document.getElementById('ai-modal-content').style.display = 'block';
            isFirstChunk = false;
        }

        buffer += decoder.decode(value, { stream: true });
        let lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const chunk = line.substring(6).trim();
                
                if (chunk === '[DONE]') {
                    bodyDiv.style.whiteSpace = 'normal';
                    bodyDiv.innerHTML = formatTextToHtmlList(fullTextBuffer);
                    bodyDiv.dataset.rawText = fullTextBuffer;
                    
                    // --- MENTÉS AZ ADATBÁZISBA (2. LEHETŐSÉG: Kifejezett [DONE] üzenet) ---
                    if (valodiMeglevok && fullTextBuffer.length > 50) {
                        const kitoltesId = valodiMeglevok.dataset.kitoltesId;
                     fetch('/api/save-ai-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kitoltesId: kitoltesId, aiText: fullTextBuffer, userId: userId })
})
.then(res => res.json())
.then(data => {
    if (data.success) {
        valodiMeglevok.dataset.aiText = fullTextBuffer;
        
        // 1. Kvóták csökkentése a kártya datasetjében
        let currentKitMax = parseInt(valodiMeglevok.dataset.aiKitMax || 10) - 1;
        let currentOsszMax = parseInt(valodiMeglevok.dataset.aiOsszMax || 100) - 1;
        
        if (currentKitMax < 0) currentKitMax = 0;
        if (currentOsszMax < 0) currentOsszMax = 0;
        
        valodiMeglevok.dataset.aiKitMax = currentKitMax;
        valodiMeglevok.dataset.aiOsszMax = currentOsszMax;

        // 2. Felugró értesítés megjelenítése a modálban
        const notificationDiv = document.getElementById('ai-modal-notification');
        if (notificationDiv) {
            notificationDiv.innerText = `Sikeres elemzés és mentés! Ehhez az értékeléshez még ${currentKitMax} alkalommal generálhat elemzést.`;
            notificationDiv.style.backgroundColor = '#4caf50'; // Siker zöld színe
            notificationDiv.style.display = 'block';
            
            setTimeout(() => { notificationDiv.style.opacity = '1'; }, 10);

            // 5 másodperc múlva eltüntetjük, és visszaállítjuk az eredeti állapotot
            setTimeout(() => {
                notificationDiv.style.opacity = '0';
                setTimeout(() => { 
                    notificationDiv.style.display = 'none'; 
                    // Visszaállítjuk az eredeti narancssárga figyelmeztetést a következő megnyitásra
                    notificationDiv.innerText = 'Erről az értékelésről már készült elemzés. Ha változtak az adatok, a "Frissítés" gombbal aktualizálhatja.';
                    notificationDiv.style.backgroundColor = '#ff8451';
                }, 500);
            }, 5000);
        }
    }
})
.catch(err => console.error('Hiba a mentés és kvótalevonás során:', err));
                    }
                    return true;
                }
                try {
                    const payload = JSON.parse(chunk);
                    const textDelta = payload.choices?.[0]?.delta?.content || '';
                    if (textDelta) {
                        fullTextBuffer += textDelta;
                        printBuffer += textDelta;
                        
                        let lastSpace = printBuffer.lastIndexOf(' ');
                        if (lastSpace > -1) {
                            bodyDiv.appendChild(document.createTextNode(printBuffer.substring(0, lastSpace + 1)));
                            printBuffer = printBuffer.substring(lastSpace + 1);
                        }
                    }
                } catch(e) {}
            }
        }
    }
  } catch (err) {
    console.error('Egyéni AI elemzés hiba:', err);
    showAlert(`Hiba történt az AI elemzés során: ${err.message}`);
    closeAiModal();
  } finally {
    if (callerBtn) callerBtn.style.pointerEvents = 'auto';
  }
}